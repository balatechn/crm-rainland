import { Body, Controller, Post, HttpException, HttpStatus, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.module';

/**
 * One-shot bootstrap endpoint to seed the database in environments where
 * `prisma db seed` cannot be triggered manually (eg. Coolify without exec).
 *
 * Usage:
 *   POST /api/bootstrap/seed
 *   Body: { "token": "<BOOTSTRAP_TOKEN env var>" }
 *
 * Idempotent — safe to call multiple times.
 * After verifying admin login works, you can leave this endpoint in place
 * (it's protected by BOOTSTRAP_TOKEN) or remove it for hardening.
 */
@Controller('bootstrap')
export class BootstrapController {
  constructor(private prisma: PrismaService, private cfg: ConfigService) {}

  @Get('status')
  async status() {
    const users = await this.prisma.user.count();
    const branches = await this.prisma.branch.count();
    const vehicles = await this.prisma.vehicle.count();
    const leadSources = await this.prisma.leadSource.count();
    const leads = await this.prisma.lead.count();
    return { users, branches, vehicles, leadSources, leads };
  }

  @Post('seed')
  async seed(@Body() body: { token?: string }) {
    const expected = this.cfg.get<string>('BOOTSTRAP_TOKEN');
    if (!expected) throw new HttpException('BOOTSTRAP_TOKEN not configured on server', HttpStatus.SERVICE_UNAVAILABLE);
    if (body?.token !== expected) throw new HttpException('Invalid bootstrap token', HttpStatus.UNAUTHORIZED);

    const pwd = await bcrypt.hash('Admin@123', 10);

    // Branches
    const branchSpecs = [
      { name: 'Bangalore', code: 'BLR', city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
      { name: 'Mangalore', code: 'MNG', city: 'Mangalore', state: 'Karnataka', pincode: '575001' },
      { name: 'Shimoga',   code: 'SMG', city: 'Shimoga',   state: 'Karnataka', pincode: '577201' },
      { name: 'Udupi',     code: 'UDP', city: 'Udupi',     state: 'Karnataka', pincode: '576101' },
      { name: 'Hubli',     code: 'HBL', city: 'Hubli',     state: 'Karnataka', pincode: '580020' },
    ];
    const branches: Record<string, string> = {};
    for (const b of branchSpecs) {
      const row = await this.prisma.branch.upsert({ where: { code: b.code }, update: {}, create: b });
      branches[b.name] = row.id;
    }

    // Vehicles
    const vehicleSpecs = [
      { brand: 'MONTRA' as const, model: 'EVIATOR',     variant: 'L4',     fuelType: 'EV' },
      { brand: 'MONTRA' as const, model: 'EVIATOR',     variant: 'L5',     fuelType: 'EV' },
      { brand: 'ISUZU'  as const, model: 'D-Max',       variant: 'V-Cross',fuelType: 'Diesel' },
      { brand: 'ISUZU'  as const, model: 'D-Max',       variant: 'Hi-Lander', fuelType: 'Diesel' },
      { brand: 'ISUZU'  as const, model: 'mu-X',        variant: '4x4',    fuelType: 'Diesel' },
      { brand: 'ISUZU'  as const, model: 'S-CAB',       variant: 'Standard', fuelType: 'Diesel' },
      { brand: 'ISUZU'  as const, model: 'Regular Cab', variant: 'Standard', fuelType: 'Diesel' },
    ];
    const branchIds = Object.values(branches).map((id) => ({ id }));
    for (const v of vehicleSpecs) {
      const existing = await this.prisma.vehicle.findFirst({ where: { brand: v.brand, model: v.model, variant: v.variant } });
      if (existing) {
        await this.prisma.vehicle.update({ where: { id: existing.id }, data: { fuelType: v.fuelType, branches: { set: branchIds } } });
      } else {
        await this.prisma.vehicle.create({ data: { ...v, branches: { connect: branchIds } } });
      }
    }

    // Lead sources
    const sourceNames = ['Website', 'WhatsApp', 'Facebook', 'Instagram', 'Walk-In', 'Referral', 'Call', 'Camp', 'Dealer Visit', 'Other'];
    for (const name of sourceNames) {
      await this.prisma.leadSource.upsert({ where: { name }, update: {}, create: { name } });
    }

    // Users
    const userSpecs = [
      { name: 'Admin',              email: 'admin@rainland.in',         role: 'ADMIN' as const },
      { name: 'CRM Manager',        email: 'crm@rainland.in',           role: 'CRM_MANAGER' as const },
      { name: 'Call Center Exec',   email: 'callcenter@rainland.in',    role: 'CALL_CENTER' as const },
      { name: 'Sales Head',         email: 'saleshead@rainland.in',     role: 'SALES_HEAD' as const },
      { name: 'Branch Manager BLR', email: 'bm.bangalore@rainland.in',  role: 'BRANCH_MANAGER' as const, branch: 'Bangalore' },
      { name: 'Sales Exec BLR',     email: 'se.bangalore@rainland.in',  role: 'SALES_EXECUTIVE' as const, branch: 'Bangalore' },
      { name: 'Team Leader BLR',    email: 'tl.bangalore@rainland.in',  role: 'TEAM_LEADER' as const,     branch: 'Bangalore' },
      { name: 'Branch Manager SMG', email: 'bm.shimoga@rainland.in',    role: 'BRANCH_MANAGER' as const, branch: 'Shimoga' },
      { name: 'Sales Exec MNG',     email: 'se.mangalore@rainland.in',  role: 'SALES_EXECUTIVE' as const, branch: 'Mangalore' },
    ];
    for (const u of userSpecs) {
      await this.prisma.user.upsert({
        where: { email: u.email },
        update: { passwordHash: pwd, active: true },
        create: { name: u.name, email: u.email, passwordHash: pwd, role: u.role as any, branchId: u.branch ? branches[u.branch] : null },
      });
    }

    return { ok: true, message: 'Database seeded. Login as admin@rainland.in / Admin@123', counts: await this.status() };
  }
}
