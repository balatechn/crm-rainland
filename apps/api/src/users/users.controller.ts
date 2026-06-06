import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt.guard';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  list(@Req() req: any, @Query('branchId') branchId?: string) {
    // Non-HO roles only see users in their own branch
    const user = req.user;
    const effectiveBranch = [Role.ADMIN, Role.CRM_MANAGER, Role.SALES_HEAD].includes(user.role)
      ? branchId
      : user.branchId ?? undefined;
    return this.svc.list(effectiveBranch);
  }

  @Roles(Role.ADMIN, Role.CRM_MANAGER)
  @Post()
  create(@Body() body: CreateUserDto) { return this.svc.create(body); }

  @Roles(Role.ADMIN, Role.CRM_MANAGER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateUserDto) { return this.svc.update(id, body); }

  @Roles(Role.ADMIN, Role.CRM_MANAGER)
  @Delete(':id')
  deactivate(@Param('id') id: string) { return this.svc.update(id, { active: false }); }

  @Get(':id/login-history')
  history(@Param('id') id: string) { return this.svc.loginHistory(id); }
}
