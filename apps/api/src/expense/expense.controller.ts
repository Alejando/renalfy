import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Audit } from '../common/decorators/audit.decorator.js';
import { ExpenseService } from './expense.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { ExpenseQueryDto } from './dto/expense-query.dto.js';
import type { UserRole } from '@repo/types';

@Controller('expense')
@UseGuards(JwtAuthGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Audit({ action: 'CREATE', resource: 'Expense' })
  create(
    @CurrentUser()
    user: {
      tenantId: string;
      userId: string;
      role: UserRole;
      locationId: string | null;
    },
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenseService.create(
      user.tenantId,
      user.userId,
      dto,
      user.role,
    );
  }

  @Get()
  @Audit({ action: 'READ', resource: 'Expense' })
  findAll(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Query() query: ExpenseQueryDto,
  ) {
    return this.expenseService.findAll(user.tenantId, query);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Audit({ action: 'DELETE', resource: 'Expense' })
  cancel(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.expenseService.cancel(user.tenantId, id);
  }
}
