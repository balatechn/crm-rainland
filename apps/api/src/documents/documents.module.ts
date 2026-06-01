import {
  Module, Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards, Injectable,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
class DocumentsService {
  constructor(private prisma: PrismaService) {}

  list(leadId: string) {
    return this.prisma.document.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { name: true } } },
    });
  }

  create(uploadedById: string, d: { leadId: string; type: string; url: string; name?: string }) {
    return this.prisma.document.create({ data: { ...d, uploadedById } });
  }

  delete(id: string) {
    return this.prisma.document.delete({ where: { id } });
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
class DocumentsController {
  constructor(private svc: DocumentsService) {}
  @Get()        list(@Query('leadId') leadId: string)   { return this.svc.list(leadId); }
  @Post()       create(@Req() req: any, @Body() body: any) { return this.svc.create(req.user.id, body); }
  @Delete(':id') remove(@Param('id') id: string)        { return this.svc.delete(id); }
}

@Module({ controllers: [DocumentsController], providers: [DocumentsService] })
export class DocumentsModule {}
