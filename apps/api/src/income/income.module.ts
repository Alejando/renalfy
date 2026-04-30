import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { IncomeController } from './income.controller.js';
import { IncomeService } from './income.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [IncomeController],
  providers: [IncomeService],
})
export class IncomeModule {}
