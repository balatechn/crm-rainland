import { Module } from '@nestjs/common';
import { Body, Controller, Get, Param, Patch, Post, UseGuards, Injectable } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt.guard';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
class BranchesService {
  constructor(private prisma: PrismaService) {}
  list() { return this.prisma.branch.findMany({ orderBy: { name: 'asc' } }); }
  get(id: string) { return this.prisma.branch.findUnique({ where: { id } }); }
  create(d: any) { return this.prisma.branch.create({ data: d }); }
  update(id: string, d: any) { return this.prisma.branch.update({ where: { id }, data: d }); }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
class BranchesController {
  constructor(private svc: BranchesService) {}
  @Get() list() { return this.svc.list(); }
  @Get(':id') get(@Param('id') id: string) { return this.svc.get(id); }
  @Roles(Role.ADMIN, Role.CRM_MANAGER)
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Roles(Role.ADMIN, Role.CRM_MANAGER)
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
}

@Module({ controllers: [BranchesController], providers: [BranchesService] })
export class BranchesModule {}
