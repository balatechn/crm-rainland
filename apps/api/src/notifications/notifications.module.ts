import {
  Module, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, Injectable,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
class NotificationsService {
  constructor(private prisma: PrismaService) {}

  list(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
  }

  create(userId: string, title: string, body: string, type: string, entityId?: string) {
    return this.prisma.notification.create({ data: { userId, title, body, type, entityId } });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()          list(@Req() req: any, @Query('unread') u: string) { return this.svc.list(req.user.id, u === 'true'); }
  @Get('count')   count(@Req() req: any)                           { return this.svc.unreadCount(req.user.id); }
  @Patch(':id/read') read(@Param('id') id: string, @Req() req: any) { return this.svc.markRead(id, req.user.id); }
  @Patch('mark-all-read') readAll(@Req() req: any)                 { return this.svc.markAllRead(req.user.id); }
}

@Module({ controllers: [NotificationsController], providers: [NotificationsService], exports: [NotificationsService] })
export class NotificationsModule {}
