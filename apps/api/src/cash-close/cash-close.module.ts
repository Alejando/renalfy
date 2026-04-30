import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CashCloseController } from './cash-close.controller.js';
import { CashCloseService } from './cash-close.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [CashCloseController],
  providers: [CashCloseService],
})
export class CashCloseModule {}
