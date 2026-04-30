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
import { IncomeService } from './income.service.js';
import { CreateIncomeDto } from './dto/create-income.dto.js';
import { IncomeQueryDto } from './dto/income-query.dto.js';
import type { UserRole } from '@repo/types';

@Controller('income')
@UseGuards(JwtAuthGuard)
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Audit({ action: 'CREATE', resource: 'Income' })
  create(
    @CurrentUser()
    user: {
      tenantId: string;
      userId: string;
      role: UserRole;
      locationId: string | null;
    },
    @Body() dto: CreateIncomeDto,
  ) {
    return this.incomeService.create(
      user.tenantId,
      user.userId,
      dto,
      user.role,
    );
  }

  @Get()
  @Audit({ action: 'READ', resource: 'Income' })
  findAll(
    @CurrentUser() user: { tenantId: string; role: UserRole },
    @Query() query: IncomeQueryDto,
  ) {
    return this.incomeService.findAll(user.tenantId, query);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @Audit({ action: 'DELETE', resource: 'Income' })
  cancel(@CurrentUser() user: { tenantId: string }, @Param('id') id: string) {
    return this.incomeService.cancel(user.tenantId, id);
  }
}
