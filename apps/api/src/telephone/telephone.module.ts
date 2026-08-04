import {
  Module, Controller, Get, Query, Res, NotFoundException,
  StreamableFile, UseGuards, Injectable, Logger, BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';

const TELECMI_BASE = 'https://rest.telecmi.com/v2';

@Injectable()
class TelephoneService {
  private readonly logger = new Logger(TelephoneService.name);

  private get appId()  { return Number(process.env.TELECMI_APP_ID); }
  private get secret() { return process.env.TELECMI_SECRET || ''; }

  async getCalls(opts: {
    start_date?: number;
    end_date?: number;
    page?: number;
    limit?: number;
  }) {
    const body: Record<string, any> = { appid: this.appId, secret: this.secret };
    if (opts.start_date) body.start_date = opts.start_date * 1000;
    if (opts.end_date)   body.end_date   = opts.end_date * 1000;
    if (opts.page)       body.page       = opts.page;
    if (opts.limit)      body.limit      = Math.min(opts.limit, 20);

    const r = await fetch(`${TELECMI_BASE}/answered`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      this.logger.warn(`TeleCMI /answered returned ${r.status}`);
      return { count: 0, cdr: [] };
    }
    return r.json();
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
}

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
}

@Module({ controllers: [TelephoneController], providers: [TelephoneService] })
export class TelephoneModule {}
