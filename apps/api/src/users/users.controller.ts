import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt.guard';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  list(@Query('branchId') branchId?: string) { return this.svc.list(branchId); }

  @Roles(Role.ADMIN, Role.CRM_MANAGER)
  @Post()
  create(@Body() body: any) { return this.svc.create(body); }

  @Roles(Role.ADMIN, Role.CRM_MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }

  @Roles(Role.ADMIN, Role.CRM_MANAGER)
  @Delete(':id')
  deactivate(@Param('id') id: string) { return this.svc.update(id, { active: false }); }

  @Get(':id/login-history')
  history(@Param('id') id: string) { return this.svc.loginHistory(id); }
}
