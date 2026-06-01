import { Body, Controller, Post, HttpException, HttpStatus, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.module';

/**
 * One-shot bootstrap endpoint to seed the database where `prisma db seed`
 * cannot be triggered manually (e.g. Coolify without exec). Idempotent.
 *   POST /api/bootstrap/seed   body: { "token": "<BOOTSTRAP_TOKEN>" }
 *   GET  /api/bootstrap/status
 */
@Controller('bootstrap')
export class BootstrapController {
  constructor(private prisma: PrismaService, private cfg: ConfigService) {}

  @Get('status')
  async status() {
    return {
      users: await this.prisma.user.count(),
      branches: await this.prisma.branch.count(),
      vehicles: await this.prisma.vehicle.count(),
      leadSources: await this.prisma.leadSource.count(),
      leads: await this.prisma.lead.count(),
    };
  }

  @Post('seed')
  async seed(@Body() body: { token?: string }) {
    const expected = this.cfg.get<string>('BOOTSTRAP_TOKEN');
    if (!expected) throw new HttpException('BOOTSTRAP_TOKEN not configured', HttpStatus.SERVICE_UNAVAILABLE);
    if (body?.token !== expected) throw new HttpException('Invalid bootstrap token', HttpStatus.UNAUTHORIZED);

    const pwd = await bcrypt.hash('Admin@123', 10);

    const branchSpecs = [
      { name: 'Bangalore', city: 'Bangalore', pincode: '560001' },
      { name: 'Mangalore', city: 'Mangalore', pincode: '575001' },
      { name: 'Shimoga',   city: 'Shimoga',   pincode: '577201' },
      { name: 'Udupi',     city: 'Udupi',     pincode: '576101' },
      { name: 'Hubli',     city: 'Hubli',     pincode: '580020' },
    ];
    const branches: Record<string, string> = {};
    for (const b of branchSpecs) {
      const row = await this.prisma.branch.upsert({ where: { name: b.name }, update: {}, create: b });
      branches[b.name] = row.id;
    }

    const vehicleSpecs: Array<{ brand: any; model: string; variant: string }> = [
      { brand: 'MONTRA', model: 'EVIATOR',     variant: 'L4' },
      { brand: 'MONTRA', model: 'EVIATOR',     variant: 'L5' },
      { brand: 'ISUZU',  model: 'D-Max',       variant: 'V-Cross' },
      { brand: 'ISUZU',  model: 'D-Max',       variant: 'Hi-Lander' },
      { brand: 'ISUZU',  model: 'mu-X',        variant: '4x4' },
      { brand: 'ISUZU',  model: 'S-CAB',       variant: 'Standard' },
      { brand: 'ISUZU',  model: 'Regular Cab', variant: 'Standard' },
    ];
    const branchConnect = Object.values(branches).map((id) => ({ id }));
    for (const v of vehicleSpecs) {
      const existing = await this.prisma.vehicle.findFirst({ where: { brand: v.brand, model: v.model, variant: v.variant } });
      if (existing) {
        await this.prisma.vehicle.update({ where: { id: existing.id }, data: { branches: { set: branchConnect } } });
      } else {
        await this.prisma.vehicle.create({ data: { ...v, branches: { connect: branchConnect } } });
      }
    }

    const sourceNames = ['Website', 'WhatsApp', 'Facebook', 'Instagram', 'Walk-In', 'Referral', 'Call', 'Camp', 'Dealer Visit', 'Other'];
    for (const name of sourceNames) {
      await this.prisma.leadSource.upsert({ where: { name }, update: {}, create: { name } });
    }

    const userSpecs: Array<{ name: string; email: string; role: any; branch?: string }> = [
      { name: 'Admin',              email: 'admin@rainland.in',         role: 'ADMIN' },
      { name: 'CRM Manager',        email: 'crm@rainland.in',           role: 'CRM_MANAGER' },
      { name: 'Call Center Exec',   email: 'callcenter@rainland.in',    role: 'CALL_CENTER' },
      { name: 'Sales Head',         email: 'saleshead@rainland.in',     role: 'SALES_HEAD' },
      { name: 'Branch Manager BLR', email: 'bm.bangalore@rainland.in',  role: 'BRANCH_MANAGER', branch: 'Bangalore' },
      { name: 'Sales Exec BLR',     email: 'se.bangalore@rainland.in',  role: 'SALES_EXECUTIVE', branch: 'Bangalore' },
      { name: 'Team Leader BLR',    email: 'tl.bangalore@rainland.in',  role: 'TEAM_LEADER',     branch: 'Bangalore' },
      { name: 'Branch Manager SMG', email: 'bm.shimoga@rainland.in',    role: 'BRANCH_MANAGER', branch: 'Shimoga' },
      { name: 'Sales Exec MNG',     email: 'se.mangalore@rainland.in',  role: 'SALES_EXECUTIVE', branch: 'Mangalore' },
    ];
    for (const u of userSpecs) {
      await this.prisma.user.upsert({
        where: { email: u.email },
        update: { passwordHash: pwd, active: true },
        create: { name: u.name, email: u.email, passwordHash: pwd, role: u.role, branchId: u.branch ? branches[u.branch] : null },
      });
    }

    return { ok: true, message: 'Seeded. Login admin@rainland.in / Admin@123', counts: await this.status() };
  }
}
