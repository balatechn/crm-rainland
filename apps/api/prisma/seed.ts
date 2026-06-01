import { PrismaClient, Role, VehicleBrand, LeadStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Rainland CRM...');

  // ---- Branches ----
  const branchData = [
    { name: 'Bangalore',   city: 'Bangalore',   pincode: '560001' },
    { name: 'Shimoga',     city: 'Shimoga',     pincode: '577201' },
    { name: 'Mangalore',   city: 'Mangalore',   pincode: '575001' },
    { name: 'Hassan',      city: 'Hassan',      pincode: '573201' },
    { name: 'Thirthahalli',city: 'Thirthahalli',pincode: '577432' },
  ];
  const branches: Record<string, string> = {};
  for (const b of branchData) {
    const row = await prisma.branch.upsert({
      where: { name: b.name },
      update: {},
      create: b,
    });
    branches[b.name] = row.id;
  }

  // ---- Lead sources ----
  const sources = [
    'WhatsApp','Walk-In','Website','Facebook','Instagram',
    'Google Ads','Referral','Existing Customer','Phone Inquiry','Exhibition/Event',
  ];
  const sourceIds: Record<string,string> = {};
  for (const name of sources) {
    const row = await prisma.leadSource.upsert({
      where: { name }, update: {}, create: { name },
    });
    sourceIds[name] = row.id;
  }

  // ---- Vehicles ----
  const vehicles = [
    { brand: VehicleBrand.MONTRA, model: 'EVIATOR',     basePrice: 1050000 },
    { brand: VehicleBrand.MONTRA, model: 'SUPER AUTO',  basePrice: 350000 },
    { brand: VehicleBrand.MONTRA, model: 'SUPER CARGO', basePrice: 480000 },
    { brand: VehicleBrand.ISUZU,  model: 'D-Max',       basePrice: 950000 },
    { brand: VehicleBrand.ISUZU,  model: 'Hi-Lander',   basePrice: 1850000 },
    { brand: VehicleBrand.ISUZU,  model: 'V-Cross',     basePrice: 2250000 },
    { brand: VehicleBrand.ISUZU,  model: 'S-Cab',       basePrice: 1450000 },
  ];
  const allBranchIds = Object.values(branches).map(id => ({ id }));
  for (const v of vehicles) {
    const existing = await prisma.vehicle.findFirst({ where: { brand: v.brand, model: v.model, variant: null } });
    if (existing) {
      await prisma.vehicle.update({ where: { id: existing.id }, data: { basePrice: v.basePrice } });
    } else {
      await prisma.vehicle.create({ data: { ...v, branches: { connect: allBranchIds } } });
    }
  }

  // ---- Users ----
  const pwd = await bcrypt.hash('Admin@123', 10);
  const users = [
    { name: 'Admin',            email: 'admin@rainland.in',        role: Role.ADMIN },
    { name: 'CRM Manager',      email: 'crm@rainland.in',          role: Role.CRM_MANAGER },
    { name: 'Call Center Exec', email: 'callcenter@rainland.in',   role: Role.CALL_CENTER },
    { name: 'Sales Head',       email: 'saleshead@rainland.in',    role: Role.SALES_HEAD },
    { name: 'Branch Manager BLR', email: 'bm.bangalore@rainland.in', role: Role.BRANCH_MANAGER, branch: 'Bangalore' },
    { name: 'Sales Exec BLR',     email: 'se.bangalore@rainland.in', role: Role.SALES_EXECUTIVE, branch: 'Bangalore' },
    { name: 'Team Leader BLR',    email: 'tl.bangalore@rainland.in', role: Role.TEAM_LEADER,     branch: 'Bangalore' },
    { name: 'Branch Manager SMG', email: 'bm.shimoga@rainland.in',   role: Role.BRANCH_MANAGER, branch: 'Shimoga' },
    { name: 'Sales Exec MNG',     email: 'se.mangalore@rainland.in', role: Role.SALES_EXECUTIVE, branch: 'Mangalore' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name, email: u.email, passwordHash: pwd, role: u.role,
        branchId: u.branch ? branches[u.branch] : null,
      },
    });
  }

  // ---- Sample leads ----
  const blr = branches['Bangalore'];
  const se = await prisma.user.findUnique({ where: { email: 'se.bangalore@rainland.in' } });
  const evi = await prisma.vehicle.findFirst({ where: { model: 'EVIATOR' } });
  const dmax = await prisma.vehicle.findFirst({ where: { model: 'D-Max' } });

  const sampleLeads = [
    { name: 'Ravi Kumar',    mobile: '9000000001', source: 'WhatsApp', vehicle: evi,  status: LeadStatus.NEW },
    { name: 'Anita Shetty',  mobile: '9000000002', source: 'Walk-In',  vehicle: dmax, status: LeadStatus.CONTACTED },
    { name: 'Mohan Rao',     mobile: '9000000003', source: 'Website',  vehicle: dmax, status: LeadStatus.TEST_DRIVE_SCHEDULED },
    { name: 'Lakshmi Devi',  mobile: '9000000004', source: 'Facebook', vehicle: evi,  status: LeadStatus.QUOTATION_SENT },
    { name: 'Suresh Patil',  mobile: '9000000005', source: 'Referral', vehicle: dmax, status: LeadStatus.BOOKING_CONFIRMED },
  ];
  for (const l of sampleLeads) {
    const exists = await prisma.lead.findFirst({ where: { mobile: l.mobile } });
    if (exists) continue;
    await prisma.lead.create({
      data: {
        name: l.name, mobile: l.mobile, city: 'Bangalore', pincode: '560001',
        status: l.status,
        sourceId: sourceIds[l.source],
        branchId: blr,
        vehicleId: l.vehicle?.id,
        assignedToId: se?.id,
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
