import { Module, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt.guard';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN' as any, 'CRM_MANAGER' as any)
@Controller('audit-logs')
class AuditController {
  constructor(private svc: AuditService) {}
  @Get() list(@Query() q: any) { return this.svc.list(q); }
}

@Module({ controllers: [AuditController], providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
