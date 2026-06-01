import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/jwt.guard';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private svc: WhatsappService) {}

  // Public webhook (verify signature in production)
  @Post('webhook')
  webhook(@Body() body: any) { return this.svc.inbound(body); }

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
