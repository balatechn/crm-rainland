import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { Role } from '@prisma/client';

/**
 * Auto-assign rules: pincode > city > branch > product.
 * Picks the sales executive in the matched branch with the fewest open leads.
 */
@Injectable()
export class LeadAssignmentService {
  constructor(private prisma: PrismaService) {}

  async resolveBranch(input: { pincode?: string; city?: string; branchId?: string }): Promise<string | null> {
    if (input.branchId) {
      const b = await this.prisma.branch.findUnique({ where: { id: input.branchId } });
      if (b) return b.id;
    }
    if (input.pincode) {
      const b = await this.prisma.branch.findFirst({ where: { pincode: input.pincode } });
      if (b) return b.id;
    }
    if (input.city) {
      const b = await this.prisma.branch.findFirst({ where: { city: { equals: input.city, mode: 'insensitive' } } });
      if (b) return b.id;
    }
    // fallback: first active branch
    const fallback = await this.prisma.branch.findFirst({ where: { active: true }, orderBy: { name: 'asc' } });
    return fallback?.id || null;
  }

  async pickExecutive(branchId: string): Promise<string | null> {
    const execs = await this.prisma.user.findMany({
      where: { branchId, active: true, role: Role.SALES_EXECUTIVE },
      select: { id: true, _count: { select: { assignedLeads: { where: { status: { notIn: ['DELIVERED', 'LOST'] } } } } } },
    });
    if (!execs.length) return null;
    execs.sort((a, b) => a._count.assignedLeads - b._count.assignedLeads);
    return execs[0].id;
  }
}
