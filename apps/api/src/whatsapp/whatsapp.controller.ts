import { Body, Controller, Delete, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/jwt.guard';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private svc: WhatsappService) {}

  // Public webhook (Evolution API posts here)
  @Post('webhook')
  webhook(@Body() body: any) { return this.svc.inbound(body); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('status')
  status() { return this.svc.getStatus(); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('qr')
  qr() { return this.svc.getQR(); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete('disconnect')
  disconnect() { return this.svc.disconnect(); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('conversations')
  conversations() { return this.svc.conversations(); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('messages')
  list(@Query() q: any) { return this.svc.list(q); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('send')
  send(@Req() req: any, @Body() body: any) { return this.svc.send(req.user.id, body); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('broadcast')
  broadcast(@Req() req: any, @Body() body: any) { return this.svc.broadcast(req.user.id, body); }
}
