import { Module, Controller, Get, Query, UseGuards, Injectable } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.module';
import { LeadStatus, WhatsAppDirection } from '@prisma/client';

@Injectable()
class ReportsService {
  constructor(private prisma: PrismaService) {}

  async leadsBySource() {
    const rows = await this.prisma.lead.groupBy({ by: ['sourceId'], _count: { _all: true } });
    const sources = await this.prisma.leadSource.findMany();
    return rows.map(r => ({ source: sources.find(s => s.id === r.sourceId)?.name, count: r._count._all }));
  }
  async leadsByBranch() {
    const rows = await this.prisma.lead.groupBy({ by: ['branchId'], _count: { _all: true } });
    const branches = await this.prisma.branch.findMany();
    return rows.map(r => ({ branch: branches.find(b => b.id === r.branchId)?.name, count: r._count._all }));
  }
  async leadsByExecutive() {
    const rows = await this.prisma.lead.groupBy({ by: ['assignedToId'], _count: { _all: true } });
    const users = await this.prisma.user.findMany();
    return rows.map(r => ({ executive: users.find(u => u.id === r.assignedToId)?.name || 'Unassigned', count: r._count._all }));
  }
  bookings(from?: string, to?: string) {
    return this.prisma.booking.findMany({
      where: { bookingDate: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } },
      include: { lead: { include: { branch: true } }, vehicle: true },
    });
  }
  deliveries(from?: string, to?: string) {
    return this.prisma.delivery.findMany({
      where: { deliveryDate: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } },
      include: { lead: { include: { branch: true } }, vehicle: true },
    });
  }
  lostLeads() {
    return this.prisma.lead.findMany({
      where: { status: LeadStatus.LOST },
      include: { branch: true, source: true, vehicle: true, assignedTo: { select: { name: true } } },
    });
  }
  async whatsappSummary() {
    const [sent, received] = await Promise.all([
      this.prisma.whatsAppMessage.count({ where: { direction: WhatsAppDirection.OUTBOUND } }),
      this.prisma.whatsAppMessage.count({ where: { direction: WhatsAppDirection.INBOUND } }),
    ]);
    const byCampaign = await this.prisma.whatsAppMessage.groupBy({
      by: ['campaign'], where: { campaign: { not: null } }, _count: { _all: true },
    });
    return { sent, received, byCampaign: byCampaign.map(c => ({ campaign: c.campaign, count: c._count._all })) };
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
class ReportsController {
  constructor(private svc: ReportsService) {}
  @Get('leads/by-source')    bySource() { return this.svc.leadsBySource(); }
  @Get('leads/by-branch')    byBranch() { return this.svc.leadsByBranch(); }
  @Get('leads/by-executive') byExec()   { return this.svc.leadsByExecutive(); }
  @Get('sales/bookings')     bookings(@Query('from') f?: string, @Query('to') t?: string) { return this.svc.bookings(f, t); }
  @Get('sales/deliveries')   deliveries(@Query('from') f?: string, @Query('to') t?: string) { return this.svc.deliveries(f, t); }
  @Get('sales/lost-leads')   lost() { return this.svc.lostLeads(); }
  @Get('whatsapp/summary')   ws()   { return this.svc.whatsappSummary(); }
}

@Module({ controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
