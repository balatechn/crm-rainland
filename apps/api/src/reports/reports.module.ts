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

  async dailySummary(date: string) {
    const d = new Date(date);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end   = new Date(d); end.setHours(23, 59, 59, 999);
    const [newLeadsCount, testDrivesCount, bookingsCount, tdStageCount, newLeads, testDrives] = await Promise.all([
      this.prisma.lead.count({ where: { createdAt: { gte: start, lte: end } } }),
      this.prisma.testDrive.count({ where: { scheduledAt: { gte: start, lte: end } } }),
      this.prisma.booking.count({ where: { bookingDate: { gte: start, lte: end } } }),
      this.prisma.lead.count({ where: { status: LeadStatus.TEST_DRIVE_SCHEDULED } }),
      this.prisma.lead.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { branch: { select: { name: true } }, source: { select: { name: true } }, assignedTo: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.testDrive.findMany({
        where: { scheduledAt: { gte: start, lte: end } },
        include: { lead: { select: { name: true, mobile: true } }, vehicle: { select: { brand: true, model: true } }, executive: { select: { name: true } } },
        orderBy: { scheduledAt: 'asc' },
      }),
    ]);
    return { newLeadsCount, testDrivesCount, bookingsCount, tdStageCount, newLeads, testDrives };
  }

  followUpReport(from?: string, to?: string) {
    return this.prisma.followUp.findMany({
      where: {
        scheduledAt: {
          gte: from ? new Date(from) : undefined,
          lte: to   ? new Date(to)   : undefined,
        },
      },
      include: {
        lead: { select: { name: true, mobile: true, branch: { select: { name: true } } } },
        user: { select: { name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async performanceReport(from?: string, to?: string) {
    const dateFilter = {
      gte: from ? new Date(from) : undefined,
      lte: to   ? new Date(to)   : undefined,
    };
    const users = await this.prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true, branch: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    return Promise.all(users.map(async u => {
      const [leads, testDrives, bookings, deliveries, followUps] = await Promise.all([
        this.prisma.lead.count({ where: { assignedToId: u.id, createdAt: dateFilter } }),
        this.prisma.testDrive.count({ where: { executiveId: u.id, scheduledAt: dateFilter } }),
        this.prisma.booking.count({ where: { lead: { assignedToId: u.id }, bookingDate: dateFilter } }),
        this.prisma.delivery.count({ where: { lead: { assignedToId: u.id }, deliveryDate: dateFilter } }),
        this.prisma.followUp.count({ where: { userId: u.id, scheduledAt: dateFilter } }),
      ]);
      return { name: u.name, role: u.role, branch: u.branch?.name || '-', leads, testDrives, bookings, deliveries, followUps };
    }));
  }

  async monthlySummary(month: string) {
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end   = new Date(year, mon,     0, 23, 59, 59, 999);
    const [leads, testDrives, bookings, deliveries, followUps] = await Promise.all([
      this.prisma.lead.count({ where: { createdAt:   { gte: start, lte: end } } }),
      this.prisma.testDrive.count({ where: { scheduledAt: { gte: start, lte: end } } }),
      this.prisma.booking.count({ where: { bookingDate: { gte: start, lte: end } } }),
      this.prisma.delivery.count({ where: { deliveryDate: { gte: start, lte: end } } }),
      this.prisma.followUp.count({ where: { scheduledAt: { gte: start, lte: end } } }),
    ]);
    // Weekly breakdown (4-5 weeks)
    const weeks: { week: string; leads: number; testDrives: number; bookings: number }[] = [];
    for (let w = 0; w < 5; w++) {
      const ws = new Date(year, mon - 1, 1 + w * 7);
      if (ws > end) break;
      const we = new Date(year, mon - 1, 7 + w * 7, 23, 59, 59, 999);
      const cap = we > end ? end : we;
      const [wLeads, wTestDrives, wBookings] = await Promise.all([
        this.prisma.lead.count({ where: { createdAt: { gte: ws, lte: cap } } }),
        this.prisma.testDrive.count({ where: { scheduledAt: { gte: ws, lte: cap } } }),
        this.prisma.booking.count({ where: { bookingDate: { gte: ws, lte: cap } } }),
      ]);
      weeks.push({ week: `Week ${w + 1}`, leads: wLeads, testDrives: wTestDrives, bookings: wBookings });
    }
    return { leads, testDrives, bookings, deliveries, followUps, weeks };
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
  @Get('daily')              daily(@Query('date') d?: string) {
    return this.svc.dailySummary(d || new Date().toISOString().split('T')[0]);
  }
  @Get('follow-ups')         followUps(@Query('from') f?: string, @Query('to') t?: string) { return this.svc.followUpReport(f, t); }
  @Get('performance')        performance(@Query('from') f?: string, @Query('to') t?: string) { return this.svc.performanceReport(f, t); }
  @Get('monthly')            monthly(@Query('month') m?: string) {
    const now = new Date();
    return this.svc.monthlySummary(m || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }
}

@Module({ controllers: [ReportsController], providers: [ReportsService] })
export class ReportsModule {}
