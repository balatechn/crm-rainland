import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { BranchesModule } from './branches/branches.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { LeadSourcesModule } from './lead-sources/lead-sources.module';
import { LeadsModule } from './leads/leads.module';
import { TestDrivesModule } from './test-drives/test-drives.module';
import { QuotationsModule } from './quotations/quotations.module';
import { BookingsModule } from './bookings/bookings.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    VehiclesModule,
    LeadSourcesModule,
    LeadsModule,
    TestDrivesModule,
    QuotationsModule,
    BookingsModule,
    DeliveriesModule,
    WhatsappModule,
    DashboardModule,
    ReportsModule,
    AuditModule,
  ],
})
export class AppModule {}
