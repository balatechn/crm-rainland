import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string, ip?: string, ua?: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { branch: true } });
    if (!user || !user.active) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.loginHistory.create({ data: { userId: user.id, ip, userAgent: ua } });

    const token = await this.jwt.signAsync({
      sub: user.id, email: user.email, role: user.role, branchId: user.branchId,
    });
    return {
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        branchId: user.branchId, branch: user.branch?.name || null,
      },
    };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, branchId: true, branch: { select: { name: true } } },
    });
  }
}
