import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt.guard';
import { LeadsService } from './leads.service';
import { Role } from '@prisma/client';
import { CreateLeadDto, UpdateLeadDto, ChangeStatusDto, AssignLeadDto, AddActivityDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private svc: LeadsService) {}

  @Get()
  list(@Req() req: any, @Query() q: any) { return this.svc.list(req.user, q); }

  @Get(':id')
  get(@Param('id') id: string) { return this.svc.get(id); }

  @Post()
  create(@Body() body: CreateLeadDto) { return this.svc.create(body); }

  @Roles(Role.ADMIN, Role.CRM_MANAGER, Role.SALES_HEAD, Role.BRANCH_MANAGER, Role.TEAM_LEADER, Role.CALL_CENTER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateLeadDto) { return this.svc.update(id, body); }

  @Patch(':id/status')
  status(@Param('id') id: string, @Body() body: ChangeStatusDto, @Req() req: any) {
    return this.svc.changeStatus(id, body.status as any, req.user.id, body.note);
  }

  @Roles(Role.ADMIN, Role.CRM_MANAGER, Role.SALES_HEAD, Role.BRANCH_MANAGER, Role.TEAM_LEADER)
  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() body: AssignLeadDto) {
    return this.svc.assign(id, body.executiveId);
  }

  @Post(':id/activities')
  activity(@Param('id') id: string, @Body() body: AddActivityDto, @Req() req: any) {
    return this.svc.addActivity(id, req.user.id, body);
  }
}
