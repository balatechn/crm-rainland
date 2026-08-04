import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { promisify } from 'util';
import { PrismaService } from '../prisma/prisma.module';

@Injectable()
export class AuthService {
  private readonly msJwksClient = jwksClient({
    jwksUri: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/discovery/v2.0/keys`,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
  });

  constructor(private prisma: PrismaService, private jwtSvc: JwtService) {}

  // ── Password login ────────────────────────────────────────────────────────

  async login(email: string, password: string, ip?: string, ua?: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { branch: true } });
    if (!user || !user.active) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.loginHistory.create({ data: { userId: user.id, ip, userAgent: ua } });

    const token = await this.jwtSvc.signAsync({
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

  // ── Microsoft SSO login ───────────────────────────────────────────────────

  async loginWithMicrosoft(idToken: string, ip?: string, ua?: string) {
    const msPayload = await this.verifyMicrosoftToken(idToken);

    const email = ((msPayload.email || msPayload.preferred_username) as string || '').toLowerCase();
    const name  = (msPayload.name as string) || email.split('@')[0];
    const oid   = msPayload.oid as string;

    if (!email || !oid) throw new UnauthorizedException('Missing required claims in Microsoft token');

    // Optional domain restriction
    const allowedDomain = (process.env.MICROSOFT_ALLOWED_DOMAIN || '').toLowerCase();
    if (allowedDomain && !email.endsWith(`@${allowedDomain}`)) {
      throw new UnauthorizedException(`Only @${allowedDomain} accounts are permitted`);
    }

    // Find existing user by Microsoft OID or matching email
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ microsoftId: oid }, { email }] },
      include: { branch: true },
    });

    if (user) {
      // Bind microsoftId to existing email-based account on first SSO login
      if (!user.microsoftId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { microsoftId: oid },
          include: { branch: true },
        });
      }

      if (!user.active) {
        return { pending: true, message: 'Your account is awaiting admin approval.' };
      }

      await this.prisma.loginHistory.create({ data: { userId: user.id, ip, userAgent: ua || 'Microsoft SSO' } });

      const token = await this.jwtSvc.signAsync({
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

    // First-time Microsoft login → create pending account
    await this.prisma.user.create({
      data: { name, email, microsoftId: oid, passwordHash: '!sso', role: 'SALES_EXECUTIVE', active: false },
    });

    return { pending: true, message: 'Account created — awaiting admin approval.' };
  }

  private async verifyMicrosoftToken(idToken: string): Promise<Record<string, unknown>> {
    const decoded = jwt.decode(idToken, { complete: true }) as any;
    if (!decoded?.header?.kid) throw new UnauthorizedException('Invalid token: missing kid');

    const getKey = promisify(
      (kid: string, cb: (err: Error | null, key: jwksClient.SigningKey | null) => void) =>
        this.msJwksClient.getSigningKey(kid, cb),
    );

    let publicKey: string;
    try {
      const signingKey = await getKey(decoded.header.kid);
      publicKey = signingKey!.getPublicKey();
    } catch {
      throw new UnauthorizedException('Could not fetch Microsoft signing key');
    }

    try {
      return jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        audience: process.env.MICROSOFT_CLIENT_ID,
      }) as Record<string, unknown>;
    } catch (err: any) {
      throw new UnauthorizedException('Microsoft token verification failed: ' + (err.message || err));
    }
  }

  // ── Profile helpers ───────────────────────────────────────────────────────

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, branchId: true, branch: { select: { name: true } } },
    });
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...(data.name ? { name: data.name } : {}) },
      select: { id: true, name: true, email: true, role: true, branchId: true },
    });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    // SSO-only users cannot set a password via this flow
    if (user.passwordHash === '!sso' || user.passwordHash === '') {
      throw new BadRequestException('Microsoft SSO accounts cannot change password here');
    }
    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');
    if (newPassword.length < 6) throw new BadRequestException('New password must be at least 6 characters');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { message: 'Password changed successfully' };
  }
}
