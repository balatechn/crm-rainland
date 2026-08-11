import {
  Module, Controller, Get, Patch, Query, Param, Body, Res,
  NotFoundException, StreamableFile, UseGuards, Injectable,
  Logger, BadRequestException, Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.module';
import { MailService } from '../mail/mail.service';

const TELECMI_BASE = 'https://rest.telecmi.com/v2';

@Injectable()
class TelephoneService {
  private readonly logger = new Logger(TelephoneService.name);
  constructor(private prisma: PrismaService, private mail: MailService) {}

  private get appId()  { return Number(process.env.TELECMI_APP_ID); }
  private get secret() { return process.env.TELECMI_SECRET || ''; }

  // ── TeleCMI ────────────────────────────────────────────────────────────────

  private async fetchEndpoint(
    path: string,
    body: Record<string, any>,
    direction: 'inbound' | 'outbound',
    answered: boolean,
  ) {
    const r = await fetch(`${TELECMI_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const raw = await r.text();
    this.logger.log(`TeleCMI ${path} ← ${r.status} ${raw.slice(0, 200)}`);
    if (!r.ok) return { count: 0, cdr: [] as any[] };
    let json: any;
    try { json = JSON.parse(raw); } catch { return { count: 0, cdr: [] as any[] }; }
    if (json.status === false || json.status === 'false') {
      this.logger.warn(`TeleCMI ${path} soft-error: ${json.message}`);
      return { count: 0, cdr: [] as any[] };
    }
    const cdr: any[] = (json.cdr || []).map((c: any) => ({ ...c, _direction: direction, _answered: answered }));
    return { count: Number(json.count) || cdr.length, cdr };
  }

  async getCalls(opts: {
    start_date?: number;
    end_date?: number;
    page?: number;
    limit?: number;
  }) {
    const base: Record<string, any> = { appid: this.appId, secret: this.secret, page: 1, limit: 20 };
    if (opts.start_date) base.start_date = opts.start_date * 1000;
    if (opts.end_date)   base.end_date   = opts.end_date   * 1000;

    this.logger.log(
      `TeleCMI CDR fetch → appid=${this.appId} start=${base.start_date} end=${base.end_date}`,
    );

    const [inAns, inMiss, outAns, outMiss] = await Promise.all([
      this.fetchEndpoint('/answered',     base, 'inbound',  true),
      this.fetchEndpoint('/missed',       base, 'inbound',  false),
      this.fetchEndpoint('/out_answered', base, 'outbound', true),
      this.fetchEndpoint('/out_missed',   base, 'outbound', false),
    ]);

    const cdr = [...inAns.cdr, ...inMiss.cdr, ...outAns.cdr, ...outMiss.cdr];
    cdr.sort((a, b) => Number(b.time) - Number(a.time));
    const count = inAns.count + inMiss.count + outAns.count + outMiss.count;

    this.logger.log(
      `CDR combined: inAns=${inAns.cdr.length} inMiss=${inMiss.cdr.length} outAns=${outAns.cdr.length} outMiss=${outMiss.cdr.length} total=${cdr.length}`,
    );

    return { count, cdr };
  }

  async getRecording(file: string) {
    const url =
      `${TELECMI_BASE}/play?appid=${this.appId}` +
      `&secret=${encodeURIComponent(this.secret)}` +
      `&file=${encodeURIComponent(file)}`;

    const r = await fetch(url);
    if (!r.ok) throw new NotFoundException('Recording not found');

    const buffer = Buffer.from(await r.arrayBuffer());
    const contentType = r.headers.get('content-type') || 'audio/wav';
    return { buffer, contentType };
  }

  // ── Local logs ─────────────────────────────────────────────────────────────

  async getLogs(cmiuids: string[]) {
    if (!cmiuids.length) return [];
    return this.prisma.telephoneLog.findMany({
      where: { cmiuid: { in: cmiuids } },
      include: {
        lead: { select: { id: true, name: true, mobile: true } },
        source: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });
  }

  async upsertLog(
    cmiuid: string,
    userId: string,
    data: {
      callerName?: string;
      disposition?: string;
      notes?: string;
      leadId?: string | null;
      sourceId?: string | null;
      testDriveRequested?: boolean;
      testDriveBranchId?: string | null;
      callerPhone?: string;
    },
  ) {
    const { callerPhone, testDriveBranchId, ...rest } = data;

    const log = await this.prisma.telephoneLog.upsert({
      where: { cmiuid },
      create: { cmiuid, ...rest, updatedById: userId },
      update: { ...rest, updatedById: userId },
      include: {
        lead: { select: { id: true, name: true, mobile: true } },
        source: { select: { id: true, name: true } },
      },
    });

    if (data.testDriveRequested) {
      // Use explicitly selected branch, or fall back to the agent's own branch
      let branch: { name: string; email: string | null } | null = null;
      if (testDriveBranchId) {
        branch = await this.prisma.branch.findUnique({
          where: { id: testDriveBranchId },
          select: { name: true, email: true },
        });
      }
      if (!branch) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          include: { branch: { select: { name: true, email: true } } },
        });
        branch = user?.branch ?? null;
      }
      const agent = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      const agentName  = agent?.name  || userId;
      const agentEmail = agent?.email || undefined;
      // Fetch full branch for email + WhatsApp fields
      const fullBranch = testDriveBranchId
        ? await this.prisma.branch.findUnique({ where: { id: testDriveBranchId } })
        : await this.prisma.branch.findFirst({ where: { id: (branch as any)?.id } });

      const alertData = {
        callerName: data.callerName || callerPhone || 'Unknown',
        callerPhone: callerPhone || 'Unknown',
        branchName: fullBranch?.name || branch?.name || 'Unknown',
        agentName,
        agentEmail,
        callTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      };

      // Email
      if (branch?.email) {
        await this.mail.sendTestDriveAlert(branch.email, alertData);
      } else {
        this.logger.warn(`No email configured for branch — email alert skipped (branchId=${testDriveBranchId ?? 'auto'})`);
      }

      // WhatsApp
      const waText = `🚗 *Test Drive Request*\n\n*Branch:* ${alertData.branchName}\n*Customer:* ${alertData.callerName}\n*Phone:* +${alertData.callerPhone}\n*Agent:* ${alertData.agentName}\n*Time:* ${alertData.callTime}\n\nPlease follow up to schedule the test drive.`;
      await this.sendWhatsAppAlert(fullBranch, waText);
    }

    return log;
  }

  private async sendWhatsAppAlert(branch: any, text: string) {
    const evoUrl      = (process.env.WHATSAPP_API_URL || '').replace(/\/$/, '');
    const evoKey      = process.env.WHATSAPP_API_TOKEN || process.env.EVOLUTION_API_KEY || '';
    const evoInstance = process.env.WHATSAPP_PHONE_ID  || process.env.WHATSAPP_INSTANCE || 'rainland';
    if (!evoUrl || !evoKey) { this.logger.warn('WhatsApp not configured — skipping WA alert'); return; }

    const headers = { apikey: evoKey, 'Content-Type': 'application/json' };
    const send = async (number: string) => {
      try {
        const r = await fetch(`${evoUrl}/message/sendText/${evoInstance}`, {
          method: 'POST', headers,
          body: JSON.stringify({ number, text }),
        });
        if (!r.ok) this.logger.warn(`WA send to ${number} failed: ${r.status}`);
        else this.logger.log(`WA alert sent to ${number}`);
      } catch (e: any) {
        this.logger.warn(`WA send error (${number}): ${e.message}`);
      }
    };

    if (branch?.whatsapp)      await send(branch.whatsapp);
    if (branch?.whatsappGroup) await send(branch.whatsappGroup);
    if (!branch?.whatsapp && !branch?.whatsappGroup) {
      this.logger.warn(`No WhatsApp number or group configured for branch ${branch?.name} — WA alert skipped`);
    }
  }

  searchLeads(mobile: string) {
    const q = mobile.replace(/\D/g, '').slice(-10);
    return this.prisma.lead.findMany({
      where: { mobile: { contains: q } },
      select: { id: true, name: true, mobile: true, status: true, branch: { select: { name: true } } },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
  }
}

// ── Controller ────────────────────────────────────────────────────────────────

@UseGuards(JwtAuthGuard)
@Controller('telephone')
class TelephoneController {
  constructor(private svc: TelephoneService) {}

  @Get('calls')
  calls(
    @Query('start_date') startDate?: string,
    @Query('end_date')   endDate?: string,
    @Query('page')       page?: string,
    @Query('limit')      limit?: string,
  ) {
    return this.svc.getCalls({
      start_date: startDate ? Number(startDate) : undefined,
      end_date:   endDate   ? Number(endDate)   : undefined,
      page:       page      ? Number(page)      : 1,
      limit:      limit     ? Number(limit)     : 20,
    });
  }

  @Get('recording')
  async recording(
    @Query('file') file: string,
    @Res({ passthrough: true }) res: any,
  ): Promise<StreamableFile> {
    if (!file) throw new BadRequestException('file param required');
    const { buffer, contentType } = await this.svc.getRecording(file);
    res.set('Content-Type', contentType);
    res.set('Content-Disposition', `inline; filename="${file}"`);
    return new StreamableFile(buffer);
  }

  @Get('logs')
  getLogs(@Query('cmiuids') cmiuids?: string) {
    const ids = (cmiuids || '').split(',').map(s => s.trim()).filter(Boolean);
    return this.svc.getLogs(ids);
  }

  @Patch('logs/:cmiuid')
  upsertLog(
    @Param('cmiuid') cmiuid: string,
    @Body() body: {
      callerName?: string; disposition?: string; notes?: string;
      leadId?: string | null; sourceId?: string | null;
      testDriveRequested?: boolean; testDriveBranchId?: string | null; callerPhone?: string;
    },
    @Req() req: any,
  ) {
    return this.svc.upsertLog(cmiuid, req.user.id, body);
  }

  @Get('leads/search')
  searchLeads(@Query('mobile') mobile: string) {
    if (!mobile) return [];
    return this.svc.searchLeads(mobile);
  }
}

@Module({ controllers: [TelephoneController], providers: [TelephoneService] })
export class TelephoneModule {}
