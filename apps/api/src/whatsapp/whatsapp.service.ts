import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { WhatsAppDirection } from '@prisma/client';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class WhatsappService {
  constructor(private prisma: PrismaService, private leads: LeadsService) {}

  list(q: { mobile?: string; leadId?: string }) {
    return this.prisma.whatsAppMessage.findMany({
      where: { mobile: q.mobile, leadId: q.leadId },
      orderBy: { createdAt: 'desc' }, take: 200,
    });
  }

  async inbound(payload: { mobile: string; body: string; name?: string; vehicleModel?: string; branchName?: string }) {
    let lead = await this.prisma.lead.findFirst({ where: { mobile: payload.mobile }, orderBy: { createdAt: 'desc' } });
    if (!lead) {
      let vehicleId: string | undefined;
      if (payload.vehicleModel) {
        const v = await this.prisma.vehicle.findFirst({ where: { model: { equals: payload.vehicleModel, mode: 'insensitive' } } });
        vehicleId = v?.id;
      }
      let branchId: string | undefined;
      if (payload.branchName) {
        const b = await this.prisma.branch.findFirst({ where: { name: { equals: payload.branchName, mode: 'insensitive' } } });
        branchId = b?.id;
      }
      lead = await this.leads.create({
        name: payload.name || 'WhatsApp Lead',
        mobile: payload.mobile,
        sourceName: 'WhatsApp',
        branchId, vehicleId,
        notes: payload.body,
      });
    }
    return this.prisma.whatsAppMessage.create({
      data: { leadId: lead.id, mobile: payload.mobile, direction: WhatsAppDirection.INBOUND, body: payload.body, status: 'received' },
    });
  }

  /** Outbound send (stub – integrate WhatsApp Business API here) */
  async send(userId: string | null, d: { mobile: string; body: string; leadId?: string; campaign?: string }) {
    // TODO: Call WhatsApp Business API using env vars WHATSAPP_API_URL / WHATSAPP_API_TOKEN / WHATSAPP_PHONE_ID
    return this.prisma.whatsAppMessage.create({
      data: {
        userId: userId || undefined,
        leadId: d.leadId, mobile: d.mobile, body: d.body,
        direction: WhatsAppDirection.OUTBOUND, status: 'sent', campaign: d.campaign,
      },
    });
  }

  async broadcast(userId: string, d: { campaign: string; body: string; leadIds: string[] }) {
    const leads = await this.prisma.lead.findMany({ where: { id: { in: d.leadIds } } });
    let sent = 0;
    for (const l of leads) {
      await this.send(userId, { mobile: l.mobile, body: d.body, leadId: l.id, campaign: d.campaign });
      sent++;
    }
    return { sent };
  }
}
