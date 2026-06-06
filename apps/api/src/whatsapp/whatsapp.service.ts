import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { WhatsAppDirection } from '@prisma/client';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private prisma: PrismaService, private leads: LeadsService) {}

  private get apiUrl()   { return (process.env.WHATSAPP_API_URL   || '').replace(/\/$/, ''); }
  private get apiToken() { return process.env.WHATSAPP_API_TOKEN  || ''; }
  private get instance() { return process.env.WHATSAPP_PHONE_ID   || 'rainland'; }

  private evoFetch(path: string, init?: RequestInit) {
    return fetch(`${this.apiUrl}${path}`, {
      ...init,
      headers: { 'apikey': this.apiToken, 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
  }

  // ── Evolution API helpers ────────────────────────────────────────────────

  async getStatus() {
    try {
      const r = await this.evoFetch(`/instance/connectionState/${this.instance}`);
      if (!r.ok) return { state: 'close', error: `HTTP ${r.status}` };
      const data = await r.json();
      return { state: data?.instance?.state || data?.state || 'close' };
    } catch (e: any) {
      return { state: 'close', error: e.message };
    }
  }

  async getQR() {
    try {
      if (!this.apiUrl) return { error: 'WhatsApp API not configured (WHATSAPP_API_URL missing)' };

      // Ensure the instance exists — create it (ignore 400/409 = already exists)
      await this.ensureInstance();

      const result = await this.connectAndExtractQR();
      if (result) return result;

      // {"count":0} or no QR means the instance exists in our code but not in Evolution DB.
      // Force-delete and recreate the instance, then retry once.
      this.logger.warn('No QR from connect — deleting stale instance and recreating');
      await this.evoFetch(`/instance/delete/${this.instance}`, { method: 'DELETE' }).catch(() => {});
      await this.ensureInstance();

      return await this.connectAndExtractQR() ?? { error: 'Evolution API returned no QR after instance recreate. Check API logs.' };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  private async ensureInstance() {
    const createRes = await this.evoFetch(`/instance/create`, {
      method: 'POST',
      body: JSON.stringify({ instanceName: this.instance, integration: 'WHATSAPP-BAILEYS' }),
    });
    if (!createRes.ok && createRes.status !== 400 && createRes.status !== 409) {
      this.logger.warn(`Instance create returned ${createRes.status}`);
    }
  }

  /** Calls /instance/connect and extracts QR from all known Evolution v2 shapes.
   *  Returns null when the response carries no QR (e.g. {"count":0}). */
  private async connectAndExtractQR(): Promise<Record<string, any> | null> {
    const r = await this.evoFetch(`/instance/connect/${this.instance}`);
    const txt = await r.text();
    this.logger.log(`Evolution /connect ${r.status}: ${txt.substring(0, 300)}`);

    if (!r.ok) return { error: `Evolution API error (${r.status}): ${txt}` };

    let data: any = {};
    try { data = JSON.parse(txt); } catch { return { error: `Bad JSON from Evolution API: ${txt}` }; }

    // Already connected
    if (data?.instance?.state === 'open' || data?.state === 'open') return { connected: true };

    // {"count":0} — instance not found in Evolution DB
    if (typeof data?.count === 'number') return null;

    // Evolution v2 QR shapes:
    // { base64: "data:image/png;base64,..." }
    // { qrcode: { base64: "..." } }
    // { code: "2@..." }  ← raw string — send as-is so frontend can render via qrcode lib
    const qr =
      data?.base64 ||
      data?.qrcode?.base64 ||
      data?.code ||
      null;

    if (!qr) return null;

    // Normalise to a data-URI so <img src="..."> works directly
    const src = qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`;
    return { qr: src };
  }

  async disconnect() {
    try {
      await this.evoFetch(`/instance/logout/${this.instance}`, { method: 'DELETE' });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  // ── Conversations ────────────────────────────────────────────────────────

  list(q: { mobile?: string; leadId?: string }) {
    return this.prisma.whatsAppMessage.findMany({
      where: { mobile: q.mobile, leadId: q.leadId },
      orderBy: { createdAt: 'desc' }, take: 200,
    });
  }

  /** Get distinct conversations (one row per mobile), most recent first */
  async conversations() {
    const rows = await this.prisma.whatsAppMessage.findMany({
      distinct: ['mobile'],
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { mobile: true, body: true, direction: true, createdAt: true, leadId: true },
    });
    // Attach lead names
    const leadIds = rows.map(r => r.leadId).filter(Boolean) as string[];
    const leadMap: Record<string, string> = {};
    if (leadIds.length) {
      const ls = await this.prisma.lead.findMany({ where: { id: { in: leadIds } }, select: { id: true, name: true } });
      ls.forEach(l => { leadMap[l.id] = l.name; });
    }
    return rows.map(r => ({
      mobile: r.mobile,
      lastMessage: r.body,
      direction: r.direction,
      at: r.createdAt,
      leadId: r.leadId,
      leadName: r.leadId ? leadMap[r.leadId] || null : null,
    }));
  }

  // ── Inbound webhook (Evolution API v2 format) ────────────────────────────

  async inbound(raw: any) {
    // Evolution API v2 webhook
    if (raw?.event === 'messages.upsert' && raw?.data) {
      const d = raw.data;
      const jid: string = d?.key?.remoteJid || '';
      const mobile = jid.replace('@s.whatsapp.net', '').replace(/\D/g, '').slice(-10);
      const text: string =
        d?.message?.conversation ||
        d?.message?.extendedTextMessage?.text ||
        d?.message?.imageMessage?.caption || '[media]';
      const fromMe: boolean = d?.key?.fromMe || false;
      const name: string = d?.pushName || '';

      if (!mobile) return { ok: false };

      let lead = await this.prisma.lead.findFirst({ where: { mobile }, orderBy: { createdAt: 'desc' } });
      if (!lead && !fromMe) {
        const sources = await this.prisma.leadSource.findFirst({ where: { name: { contains: 'WhatsApp', mode: 'insensitive' } } });
        const branch  = await this.prisma.branch.findFirst();
        if (sources && branch) {
          lead = await this.prisma.lead.create({
            data: { name: name || 'WhatsApp Lead', mobile, sourceId: sources.id, branchId: branch.id, notes: text },
          });
        }
      }
      return this.prisma.whatsAppMessage.create({
        data: {
          leadId: lead?.id,
          mobile,
          direction: fromMe ? WhatsAppDirection.OUTBOUND : WhatsAppDirection.INBOUND,
          body: text,
          status: 'received',
        },
      });
    }

    // Legacy / manual inbound format
    if (raw?.mobile && raw?.body) {
      const { mobile, body, name, vehicleModel, branchName } = raw;
      let lead = await this.prisma.lead.findFirst({ where: { mobile }, orderBy: { createdAt: 'desc' } });
      if (!lead) {
        let vehicleId: string | undefined;
        if (vehicleModel) {
          const v = await this.prisma.vehicle.findFirst({ where: { model: { equals: vehicleModel, mode: 'insensitive' } } });
          vehicleId = v?.id;
        }
        let branchId: string | undefined;
        if (branchName) {
          const b = await this.prisma.branch.findFirst({ where: { name: { equals: branchName, mode: 'insensitive' } } });
          branchId = b?.id;
        }
        lead = await this.leads.create({ name: name || 'WhatsApp Lead', mobile, sourceName: 'WhatsApp', branchId, vehicleId, notes: body });
      }
      return this.prisma.whatsAppMessage.create({
        data: { leadId: lead.id, mobile, direction: WhatsAppDirection.INBOUND, body, status: 'received' },
      });
    }

    return { ok: true };
  }

  // ── Send via Evolution API ───────────────────────────────────────────────

  async send(userId: string | null, d: { mobile: string; body: string; leadId?: string; campaign?: string }) {
    let status = 'sent';
    if (this.apiUrl) {
      try {
        const phone = `${d.mobile}@s.whatsapp.net`;
        const r = await this.evoFetch(`/message/sendText/${this.instance}`, {
          method: 'POST',
          body: JSON.stringify({ number: phone, text: d.body }),
        });
        if (!r.ok) { status = 'failed'; }
      } catch (e: any) {
        this.logger.warn(`Evolution send failed: ${e.message}`);
        status = 'failed';
      }
    }
    return this.prisma.whatsAppMessage.create({
      data: {
        userId: userId || undefined,
        leadId: d.leadId, mobile: d.mobile, body: d.body,
        direction: WhatsAppDirection.OUTBOUND, status, campaign: d.campaign,
      },
    });
  }

  async broadcast(userId: string, d: { campaign: string; body: string; leadIds: string[] }) {
    const ls = await this.prisma.lead.findMany({ where: { id: { in: d.leadIds } } });
    let sent = 0;
    for (const l of ls) {
      await this.send(userId, { mobile: l.mobile, body: d.body, leadId: l.id, campaign: d.campaign });
      sent++;
    }
    return { sent };
  }
}
