import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  list(branchId?: string) {
    return this.prisma.user.findMany({
      where: branchId ? { branchId } : {},
      select: { id:true,name:true,email:true,phone:true,role:true,active:true,branchId:true,branch:{select:{name:true}},createdAt:true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { name:string; email:string; password:string; role:Role; branchId?:string|null; phone?:string }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: { name:data.name, email:data.email, passwordHash, role:data.role, branchId:data.branchId||null, phone:data.phone },
      select: { id:true,name:true,email:true,role:true,branchId:true },
    });
    // Send welcome email (non-blocking — failure is logged, not thrown)
    this.mail.sendWelcome(data.email, data.name, data.password);
    return user;
  }

  update(id: string, data: { name?:string; phone?:string; active?:boolean; role?:Role; branchId?:string|null }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  loginHistory(userId: string) {
    return this.prisma.loginHistory.findMany({ where: { userId }, orderBy: { loggedAt:'desc' }, take: 50 });
  }
}
