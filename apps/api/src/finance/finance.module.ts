import {
  Module, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, Injectable,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.module';

const FINANCE_STATUSES = ['APPLIED', 'APPROVED', 'REJECTED', 'DISBURSED'];

@Injectable()
class FinanceService {
  constructor(private prisma: PrismaService) {}

  list(q: { leadId?: string; status?: string }) {
    return this.prisma.finance.findMany({
      where: { ...(q.leadId ? { leadId: q.leadId } : {}), ...(q.status ? { status: q.status } : {}) },
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { id: true, name: true, mobile: true, branch: { select: { name: true } } } },
        booking: { select: { id: true, number: true } },
      },
    });
  }

  create(d: any) {
    const { bookingId, ...rest } = d;
    return this.prisma.finance.create({
      data: { ...rest, ...(bookingId ? { bookingId } : {}) },
    });
  }

  update(id: string, d: any) {
    return this.prisma.finance.update({ where: { id }, data: d });
  }

  summary() {
    return this.prisma.finance.groupBy({
      by: ['status'], _count: { _all: true },
      _sum: { loanAmount: true },
    });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance')
class FinanceController {
  constructor(private svc: FinanceService) {}
  @Get()          list(@Query() q: any)                 { return this.svc.list(q); }
  @Get('summary') summary()                             { return this.svc.summary(); }
  @Post()         create(@Body() body: any)             { return this.svc.create(body); }
  @Patch(':id')   update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
}

@Module({ controllers: [FinanceController], providers: [FinanceService] })
export class FinanceModule {}
