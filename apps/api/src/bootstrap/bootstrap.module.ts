import { Module } from '@nestjs/common';
import { BootstrapController } from './bootstrap.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BootstrapController],
})
export class BootstrapModule {}
