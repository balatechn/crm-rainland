import { Module, Body, Controller, Get, Param, Patch, Post, Req, UseGuards, Injectable } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.module';
import { LeadStatus } from '@prisma/client';

@Injectable()
class TestDrivesService {
  constructor(private prisma: PrismaService) {}
  list() { return this.prisma.testDrive.findMany({ orderBy: { scheduledAt: 'desc' }, include: { lead:true, vehicle:true, executive:{select:{name:true}} } }); }
  async create(d: any) {
    const td = await this.prisma.testDrive.create({ data: {
      leadId: d.leadId, vehicleId: d.vehicleId, executiveId: d.executiveId,
      scheduledAt: new Date(d.scheduledAt),
    }});
    await this.prisma.lead.update({ where: { id: d.leadId }, data: { status: LeadStatus.TEST_DRIVE_SCHEDULED } });
    return td;
  }
  async complete(id: string, feedback?: string) {
    const td = await this.prisma.testDrive.update({ where: { id }, data: { completed: true, feedback } });
    await this.prisma.lead.update({ where: { id: td.leadId }, data: { status: LeadStatus.TEST_DRIVE_COMPLETED } });
    return td;
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('test-drives')
class TestDrivesController {
  constructor(private svc: TestDrivesService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Patch(':id/complete') complete(@Param('id') id: string, @Body() body: any) { return this.svc.complete(id, body?.feedback); }
}

@Module({ controllers: [TestDrivesController], providers: [TestDrivesService] })
export class TestDrivesModule {}
