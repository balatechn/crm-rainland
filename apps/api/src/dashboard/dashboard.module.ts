import { Module, Controller, Get, Query, Req, UseGuards, Injectable } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.module';
import { LeadStatus, Role } from '@prisma/client';
import { HO_ROLES } from '../common/scope';

@Injectable()
class DashboardService {
  constructor(private prisma: PrismaService) {}

  async overview(user: { role: Role; branchId?: string | null }, range: 'daily'|'weekly'|'monthly' = 'monthly') {
    const since = new Date();
    if (range === 'daily') since.setDate(since.getDate()-1);
    else if (range === 'weekly') since.setDate(since.getDate()-7);
    else since.setMonth(since.getMonth()-1);

    const branchScope = HO_ROLES.includes(user.role) ? {} : { branchId: user.branchId || '__none__' };

    const [totalLeads, byStatus, byBranch, testDrives, quotations, bookings, deliveries] = await Promise.all([
      this.prisma.lead.count({ where: { ...branchScope, createdAt: { gte: since } } }),
      this.prisma.lead.groupBy({ by: ['status'], where: { ...branchScope }, _count: { _all: true } }),
      this.prisma.lead.groupBy({ by: ['branchId'], where: HO_ROLES.includes(user.role) ? {} : branchScope, _count: { _all: true } }),
      this.prisma.testDrive.count({ where: { createdAt: { gte: since }, lead: branchScope as any } }),
      this.prisma.quotation.count({ where: { createdAt: { gte: since }, lead: branchScope as any } }),
      this.prisma.booking.count({ where: { createdAt: { gte: since }, lead: branchScope as any } }),
      this.prisma.delivery.count({ where: { createdAt: { gte: since }, lead: branchScope as any } }),
    ]);

    const totalForConv = byStatus.reduce((s, r) => s + r._count._all, 0);
    const delivered = byStatus.find(r => r.status === LeadStatus.DELIVERED)?._count._all || 0;
    const conversion = totalForConv ? Math.round((delivered / totalForConv) * 10000) / 100 : 0;

    const branches = await this.prisma.branch.findMany();
    const byBranchNamed = byBranch.map(b => ({
      branchId: b.branchId, branch: branches.find(x => x.id === b.branchId)?.name, count: b._count._all,
    }));

    return {
      range,
      totalLeads, testDrives, quotations, bookings, deliveries, conversion,
      byStatus: byStatus.map(s => ({ status: s.status, count: s._count._all })),
      byBranch: byBranchNamed,
    };
  }

  async branchExecPerformance(branchId: string) {
    return this.prisma.user.findMany({
      where: { branchId, role: Role.SALES_EXECUTIVE },
      select: {
        id: true, name: true,
        _count: { select: {
          assignedLeads: true,
          bookings: true,
          deliveries: true,
          testDrives: true,
        }},
      },
    });
  }

  async pendingFollowups(user: { role: Role; branchId?: string | null }) {
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000);
    const branchScope = HO_ROLES.includes(user.role) ? {} : { branchId: user.branchId || '__none__' };
    return this.prisma.lead.findMany({
      where: {
        ...branchScope,
        status: { notIn: [LeadStatus.DELIVERED, LeadStatus.LOST] },
        OR: [{ lastContactedAt: null }, { lastContactedAt: { lt: cutoff } }],
      },
      include: { branch: true, assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
class DashboardController {
  constructor(private svc: DashboardService) {}
  @Get('overview') overview(@Req() req: any, @Query('range') range?: any) { return this.svc.overview(req.user, range); }
  @Get('branch/:id/performance') perf(@Req() req: any, @Query('branchId') _x: string) { return this.svc.branchExecPerformance(req.user.branchId); }
  @Get('followups') followups(@Req() req: any) { return this.svc.pendingFollowups(req.user); }
}

@Module({ controllers: [DashboardController], providers: [DashboardService] })
export class DashboardModule {}
