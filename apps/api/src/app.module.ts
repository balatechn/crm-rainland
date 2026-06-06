import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { BootstrapModule } from './bootstrap/bootstrap.module';
import { FollowUpsModule } from './follow-ups/follow-ups.module';
import { FinanceModule } from './finance/finance.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WalkInsModule } from './walk-ins/walk-ins.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    VehiclesModule,
    LeadSourcesModule,
    LeadsModule,
    FollowUpsModule,
    FinanceModule,
    DocumentsModule,
    NotificationsModule,
    WalkInsModule,
    TestDrivesModule,
    QuotationsModule,
    BookingsModule,
    DeliveriesModule,
    WhatsappModule,
    DashboardModule,
    ReportsModule,
    AuditModule,
    BootstrapModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
