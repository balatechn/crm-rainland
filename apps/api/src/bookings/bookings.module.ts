import { Module, Body, Controller, Get, Post, Req, UseGuards, Injectable } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.module';
import { LeadStatus } from '@prisma/client';

@Injectable()
class BookingsService {
  constructor(private prisma: PrismaService) {}
  list() {
    return this.prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      include: { lead:{ include: { branch:true } }, vehicle:true, createdBy:{select:{name:true}}, delivery:true },
    });
  }
  async create(userId: string, d: any) {
    const number = 'B' + Date.now();
    const b = await this.prisma.booking.create({ data: {
      number, leadId: d.leadId, vehicleId: d.vehicleId, createdById: userId,
      bookingAmount: Number(d.bookingAmount), bookingDate: new Date(d.bookingDate),
      paymentMethod: d.paymentMethod, financeOption: d.financeOption,
    }});
    await this.prisma.lead.update({ where: { id: d.leadId }, data: { status: LeadStatus.BOOKING_CONFIRMED } });
    return b;
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
class BookingsController {
  constructor(private svc: BookingsService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Req() req: any, @Body() body: any) { return this.svc.create(req.user.id, body); }
}

@Module({ controllers: [BookingsController], providers: [BookingsService] })
export class BookingsModule {}
