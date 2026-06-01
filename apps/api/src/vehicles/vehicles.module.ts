import { Module, Body, Controller, Get, Param, Patch, Post, UseGuards, Injectable } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt.guard';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
class VehiclesService {
  constructor(private prisma: PrismaService) {}
  list() { return this.prisma.vehicle.findMany({ orderBy: [{ brand: 'asc' }, { model: 'asc' }], include: { branches: true } }); }
  get(id: string) { return this.prisma.vehicle.findUnique({ where: { id }, include: { branches: true } }); }
  create(d: any) {
    const { branchIds, ...rest } = d;
    return this.prisma.vehicle.create({
      data: { ...rest, branches: branchIds ? { connect: branchIds.map((id: string) => ({ id })) } : undefined },
    });
  }
  update(id: string, d: any) {
    const { branchIds, ...rest } = d;
    return this.prisma.vehicle.update({
      where: { id },
      data: { ...rest, branches: branchIds ? { set: branchIds.map((id: string) => ({ id })) } : undefined },
    });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vehicles')
class VehiclesController {
  constructor(private svc: VehiclesService) {}
  @Get() list() { return this.svc.list(); }
  @Get(':id') get(@Param('id') id: string) { return this.svc.get(id); }
  @Roles(Role.ADMIN, Role.CRM_MANAGER)
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Roles(Role.ADMIN, Role.CRM_MANAGER)
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
}

@Module({ controllers: [VehiclesController], providers: [VehiclesService] })
export class VehiclesModule {}
