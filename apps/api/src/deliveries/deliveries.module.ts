import { Module, Body, Controller, Get, Post, Req, UseGuards, Injectable, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.module';
import { LeadStatus } from '@prisma/client';

@Injectable()
class DeliveriesService {
  constructor(private prisma: PrismaService) {}
  list() {
    return this.prisma.delivery.findMany({
      orderBy: { createdAt: 'desc' },
      include: { lead: { include: { branch: true } }, vehicle: true, createdBy: { select: { name: true } } },
    });
  }
  async create(userId: string, d: any) {
    const booking = await this.prisma.booking.findUnique({ where: { id: d.bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    const del = await this.prisma.delivery.create({
      data: {
        bookingId: booking.id, leadId: booking.leadId, vehicleId: booking.vehicleId, createdById: userId,
        deliveryDate: new Date(d.deliveryDate),
        registrationNo: d.registrationNo, photos: d.photos || [], customerFeedback: d.customerFeedback,
      },
    });
    await this.prisma.lead.update({ where: { id: booking.leadId }, data: { status: LeadStatus.DELIVERED } });
    return del;
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('deliveries')
class DeliveriesController {
  constructor(private svc: DeliveriesService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Req() req: any, @Body() body: any) { return this.svc.create(req.user.id, body); }
}

@Module({ controllers: [DeliveriesController], providers: [DeliveriesService] })
export class DeliveriesModule {}
