import { Module, Controller, Get, Query, UseGuards, Injectable } from '@nestjs/common';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt.guard';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
class AuditService {
  constructor(private prisma: PrismaService) {}
  list(q: { userId?: string; entity?: string }) {
    return this.prisma.auditLog.findMany({
      where: { userId: q.userId, entity: q.entity },
      orderBy: { createdAt: 'desc' }, take: 200,
      include: { user: { select: { name: true, email: true } } },
    });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.CRM_MANAGER)
@Controller('audit-logs')
class AuditController {
  constructor(private svc: AuditService) {}
  @Get() list(@Query() q: any) { return this.svc.list(q); }
}

@Module({ controllers: [AuditController], providers: [AuditService] })
export class AuditModule {}
