import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { MailService } from '../mail/mail.service';
import { CreateUserDto, UpdateUserDto } from './dto';

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

  async create(data: CreateUserDto) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: { name:data.name, email:data.email, passwordHash, role:data.role as Role, branchId:data.branchId||null, phone:data.phone },
      select: { id:true,name:true,email:true,role:true,branchId:true },
    });
    this.mail.sendWelcome(data.email, data.name, data.password);
    return user;
  }

  update(id: string, data: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data: { ...data, role: data.role as Role | undefined } });
  }

  loginHistory(userId: string) {
    return this.prisma.loginHistory.findMany({ where: { userId }, orderBy: { loggedAt:'desc' }, take: 50 });
  }
}
