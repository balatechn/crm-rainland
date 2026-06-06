import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LeadStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { LeadAssignmentService } from './lead-assignment.service';
import { branchScopeWhere } from '../common/scope';
import { CreateLeadDto, UpdateLeadDto } from './dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService, private assigner: LeadAssignmentService) {}

  async list(user: { role: Role; branchId?: string | null }, q: { status?: string; search?: string; branchId?: string }) {
    const where: any = { ...branchScopeWhere(user) };
    if (q.branchId && (user.role === Role.ADMIN || user.role === Role.CRM_MANAGER || user.role === Role.SALES_HEAD)) {
      where.branchId = q.branchId;
    }
    if (q.status) where.status = q.status;
    if (q.search) {
      where.OR = [
        { name:   { contains: q.search, mode: 'insensitive' } },
        { mobile: { contains: q.search } },
        { email:  { contains: q.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { source: true, branch: true, vehicle: true, assignedTo: { select: { id:true, name:true } } },
      take: 200,
    });
  }

  async get(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        source: true, branch: true, vehicle: true,
        assignedTo: { select: { id:true, name:true, email:true } },
        activities: { orderBy: { createdAt:'desc' }, include: { user: { select: { name:true } } } },
        followUps: { orderBy: { scheduledAt:'asc' }, include: { user: { select: { id:true, name:true } } } },
        testDrives: { include: { vehicle:true, executive: { select: { name:true } } } },
        quotations: true,
        bookings: true,
        deliveries: true,
        finances: true,
        documents: { include: { uploadedBy: { select: { name:true } } } },
        whatsappLogs: { orderBy: { createdAt:'desc' }, take: 50 },
      },
    });
    if (!lead) throw new NotFoundException();
    return lead;
  }

  async create(dto: CreateLeadDto) {
    if (!dto.name || !dto.mobile) throw new BadRequestException('name and mobile required');

    let sourceId = dto.sourceId;
    if (!sourceId && dto.sourceName) {
      const s = await this.prisma.leadSource.upsert({
        where: { name: dto.sourceName }, update: {}, create: { name: dto.sourceName },
      });
      sourceId = s.id;
    }
    if (!sourceId) {
      const s = await this.prisma.leadSource.findFirst();
      if (!s) throw new BadRequestException('No lead source defined');
      sourceId = s.id;
    }

    const branchId = await this.assigner.resolveBranch({
      branchId: dto.branchId, pincode: dto.pincode, city: dto.city,
    });
    if (!branchId) throw new BadRequestException('No branch could be resolved');

    const assignedToId = await this.assigner.pickExecutive(branchId);

    return this.prisma.lead.create({
      data: {
        name: dto.name, mobile: dto.mobile, alternateMobile: dto.alternateMobile, email: dto.email, city: dto.city, pincode: dto.pincode,
        notes: dto.notes, sourceId, branchId, vehicleId: dto.vehicleId, assignedToId,
      },
      include: { source:true, branch:true, vehicle:true, assignedTo:{ select:{ id:true,name:true } } },
    });
  }

  async update(id: string, dto: UpdateLeadDto) {
    return this.prisma.lead.update({ where: { id }, data: dto });
  }

  async changeStatus(id: string, status: LeadStatus, userId: string, note?: string) {
    const updated = await this.prisma.lead.update({ where: { id }, data: { status, lastContactedAt: new Date() } });
    await this.prisma.activity.create({
      data: { leadId: id, userId, type: 'STATUS_CHANGE', note: note || `Status changed to ${status}` },
    });
    return updated;
  }

  async assign(id: string, executiveId: string) {
    return this.prisma.lead.update({ where: { id }, data: { assignedToId: executiveId } });
  }

  async addActivity(id: string, userId: string, body: { type: string; note?: string; gpsLat?: number; gpsLng?: number }) {
    await this.prisma.lead.update({ where: { id }, data: { lastContactedAt: new Date() } });
    return this.prisma.activity.create({
      data: { leadId: id, userId, type: body.type, note: body.note, gpsLat: body.gpsLat, gpsLng: body.gpsLng },
    });
  }
}
