import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadAssignmentService } from './lead-assignment.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadAssignmentService],
  exports: [LeadsService, LeadAssignmentService],
})
export class LeadsModule {}
