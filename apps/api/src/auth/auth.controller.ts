import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login')
  login(@Body() body: { email: string; password: string }, @Req() req: any) {
    return this.auth.login(body.email, body.password, req.ip, req.headers['user-agent']);
  }

  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @Post('microsoft')
  microsoft(@Body() body: { idToken: string }, @Req() req: any) {
    return this.auth.loginWithMicrosoft(body.idToken, req.ip, req.headers['user-agent']);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Req() req: any, @Body() body: { name?: string }) {
    return this.auth.updateProfile(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: any, @Body() body: { oldPassword: string; newPassword: string }) {
    return this.auth.changePassword(req.user.id, body.oldPassword, body.newPassword);
  }
}
