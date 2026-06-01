import { Module, Body, Controller, Get, Param, Patch, Post, UseGuards, Injectable } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt.guard';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
class LeadSourcesService {
  constructor(private prisma: PrismaService) {}
  list() { return this.prisma.leadSource.findMany({ orderBy: { name: 'asc' } }); }
  create(d: any) { return this.prisma.leadSource.create({ data: d }); }
  update(id: string, d: any) { return this.prisma.leadSource.update({ where: { id }, data: d }); }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lead-sources')
class LeadSourcesController {
  constructor(private svc: LeadSourcesService) {}
  @Get() list() { return this.svc.list(); }
  @Roles(Role.ADMIN, Role.CRM_MANAGER)
  @Post() create(@Body() b: any) { return this.svc.create(b); }
  @Roles(Role.ADMIN, Role.CRM_MANAGER)
  @Patch(':id') update(@Param('id') id: string, @Body() b: any) { return this.svc.update(id, b); }
}

@Module({ controllers: [LeadSourcesController], providers: [LeadSourcesService] })
export class LeadSourcesModule {}
