import { Module, Body, Controller, Get, Post, Query, UseGuards, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
class WalkInsService {
  constructor(private prisma: PrismaService) {}

  list(branchId?: string) {
    return this.prisma.walkIn.findMany({
      where: branchId ? { branchId } : {},
      include: {
        vehicle:    { select: { id: true, brand: true, model: true } },
        branch:     { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data: {
    name: string; phone: string; email?: string;
    vehicleId?: string; branchId: string;
    testDrive?: boolean; notes?: string; assignedToId?: string;
  }) {
    return this.prisma.walkIn.create({
      data: {
        name:         data.name,
        phone:        data.phone,
        email:        data.email,
        vehicleId:    data.vehicleId || null,
        branchId:     data.branchId,
        testDrive:    data.testDrive ?? false,
        notes:        data.notes,
        assignedToId: data.assignedToId || null,
      },
      include: {
        vehicle:    { select: { id: true, brand: true, model: true } },
        branch:     { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }
}

@UseGuards(JwtAuthGuard)
@Controller('walk-ins')
class WalkInsController {
  constructor(private svc: WalkInsService) {}

  @Get()
  list(@Query('branchId') branchId?: string) {
    return this.svc.list(branchId);
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }
}

@Module({ controllers: [WalkInsController], providers: [WalkInsService] })
export class WalkInsModule {}
