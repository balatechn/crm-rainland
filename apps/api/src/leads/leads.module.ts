import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadAssignmentService } from './lead-assignment.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService, LeadAssignmentService],
  exports: [LeadsService, LeadAssignmentService],
})
export class LeadsModule {}
