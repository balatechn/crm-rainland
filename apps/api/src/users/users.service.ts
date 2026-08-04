import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private mail: MailService, private audit: AuditService) {}

  list(branchId?: string) {
    return this.prisma.user.findMany({
      where: branchId ? { branchId } : {},
      select: { id:true,name:true,email:true,phone:true,role:true,active:true,branchId:true,branch:{select:{name:true}},createdAt:true,microsoftId:true },
      orderBy: { createdAt: 'desc' },
    });
  }

  listPendingSso() {
    return this.prisma.user.findMany({
      where: { active: false, microsoftId: { not: null } },
      select: { id:true, name:true, email:true, createdAt:true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: CreateUserDto) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: { name:data.name, email:data.email, passwordHash, role:data.role as Role, branchId:data.branchId||null, phone:data.phone },
      select: { id:true,name:true,email:true,role:true,branchId:true },
    });
    this.mail.sendWelcome(data.email, data.name, data.password);
    this.audit.log(user.id, 'CREATE', 'User', user.id, { email: user.email, role: user.role });
    return user;
  }

  async update(id: string, data: UpdateUserDto) {
    const updated = await this.prisma.user.update({ where: { id }, data: { ...data, role: data.role as Role | undefined } });
    this.audit.log(id, 'UPDATE', 'User', id, data as any);
    return updated;
  }

  async approveSsoUser(id: string, role: string, branchId?: string) {
    const pending = await this.prisma.user.findUnique({ where: { id } });
    if (!pending || !pending.microsoftId) throw new NotFoundException('Pending SSO user not found');

    const user = await this.prisma.user.update({
      where: { id },
      data: { active: true, role: role as Role, branchId: branchId || null },
      select: { id:true, name:true, email:true, role:true, branchId:true },
    });
    this.audit.log(id, 'APPROVE_SSO', 'User', id, { role, branchId });
    return user;
  }

  loginHistory(userId: string) {
    return this.prisma.loginHistory.findMany({ where: { userId }, orderBy: { loggedAt:'desc' }, take: 50 });
  }
}
