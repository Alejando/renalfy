import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { UserRole } from '@repo/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator.js';
import { PlansService } from './plans.service.js';
import { CreatePlanDto } from './dto/create-plan.dto.js';
import { UpdatePlanDto } from './dto/update-plan.dto.js';
import { PlanQueryDto } from './dto/plan-query.dto.js';

const ALL_STAFF: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'];

@UseGuards(JwtAuthGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @Roles(...ALL_STAFF)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreatePlanDto, @CurrentUser() user: CurrentUserPayload) {
    return this.plansService.create(
      dto,
      user.tenantId,
      user.userId,
      user.locationId,
    );
  }

  @Get()
  findAll(
    @Query() query: PlanQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.plansService.findAll(user.tenantId, user.locationId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.plansService.findOne(id, user.tenantId, user.locationId);
  }

  @Patch(':id')
  @Roles(...ALL_STAFF)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.plansService.update(id, dto, user.tenantId, user.locationId);
  }

  @Delete(':id')
  @Roles(...ALL_STAFF)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.plansService.remove(id, user.tenantId, user.locationId);
  }
}
