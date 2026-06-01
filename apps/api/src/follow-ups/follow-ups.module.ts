import {
  Module, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards, Injectable,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
class FollowUpsService {
  constructor(private prisma: PrismaService) {}

  list(q: { userId?: string; leadId?: string; date?: string; status?: string }) {
    const where: any = {};
    if (q.userId)   where.userId   = q.userId;
    if (q.leadId)   where.leadId   = q.leadId;
    if (q.status)   where.status   = q.status;
    if (q.date) {
      const d = new Date(q.date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.scheduledAt = { gte: d, lt: next };
    }
    return this.prisma.followUp.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        lead: { select: { id: true, name: true, mobile: true, branch: { select: { name: true } } } },
        user: { select: { id: true, name: true } },
      },
    });
  }

  today(userId: string) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    return this.prisma.followUp.findMany({
      where: { userId, scheduledAt: { gte: start, lte: end } },
      orderBy: { scheduledAt: 'asc' },
      include: { lead: { select: { id: true, name: true, mobile: true } } },
    });
  }

  pending(userId?: string) {
    const cutoff = new Date();
    return this.prisma.followUp.findMany({
      where: {
        ...(userId ? { userId } : {}),
        status: 'PENDING',
        scheduledAt: { lt: cutoff },
      },
      orderBy: { scheduledAt: 'asc' },
      include: { lead: { select: { id: true, name: true, mobile: true, branch: { select: { name: true } } } }, user: { select: { name: true } } },
    });
  }

  create(userId: string, d: { leadId: string; type: string; scheduledAt: string; note?: string }) {
    return this.prisma.followUp.create({
      data: { leadId: d.leadId, userId, type: d.type, scheduledAt: new Date(d.scheduledAt), note: d.note },
      include: { lead: { select: { id: true, name: true, mobile: true } } },
    });
  }

  async complete(id: string, note?: string) {
    return this.prisma.followUp.update({
      where: { id },
      data: { status: 'DONE', completedAt: new Date(), note: note },
    });
  }

  update(id: string, d: any) {
    return this.prisma.followUp.update({ where: { id }, data: d });
  }

  delete(id: string) {
    return this.prisma.followUp.delete({ where: { id } });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('follow-ups')
class FollowUpsController {
  constructor(private svc: FollowUpsService) {}

  @Get()
  list(@Query() q: any, @Req() req: any) {
    return this.svc.list(q);
  }

  @Get('today')
  today(@Req() req: any) { return this.svc.today(req.user.id); }

  @Get('pending')
  pending(@Req() req: any) { return this.svc.pending(req.user.id); }

  @Post()
  create(@Req() req: any, @Body() body: any) { return this.svc.create(req.user.id, body); }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @Body() body: { note?: string }) { return this.svc.complete(id, body.note); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.delete(id); }
}

@Module({ controllers: [FollowUpsController], providers: [FollowUpsService] })
export class FollowUpsModule {}
