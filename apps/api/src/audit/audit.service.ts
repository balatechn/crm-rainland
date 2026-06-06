import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(userId: string | null, action: string, entity: string, entityId?: string, meta?: Record<string, any>) {
    return this.prisma.auditLog.create({
      data: { userId: userId ?? undefined, action, entity, entityId, meta },
    }).catch(() => {});   // never throw — audit failures must not break the request
  }

  list(q: { userId?: string; entity?: string }) {
    return this.prisma.auditLog.findMany({
      where: { userId: q.userId, entity: q.entity },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { name: true, email: true } } },
    });
  }
}
