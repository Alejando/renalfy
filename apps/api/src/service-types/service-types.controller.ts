import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import type { UserRole } from '@repo/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator.js';
import { ServiceTypesService } from './service-types.service.js';
import { CreateServiceTypeDto } from './dto/create-service-type.dto.js';
import { UpdateServiceTypeDto } from './dto/update-service-type.dto.js';

const WRITERS: UserRole[] = ['OWNER', 'ADMIN'];

@UseGuards(JwtAuthGuard)
@Controller('service-types')
export class ServiceTypesController {
  constructor(private readonly serviceTypesService: ServiceTypesService) {}

  @Post()
  @Roles(...WRITERS)
  create(
    @Body() dto: CreateServiceTypeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.serviceTypesService.create(dto, user.tenantId);
  }

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.serviceTypesService.findAll(user.tenantId);
  }

  @Patch(':id')
  @Roles(...WRITERS)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateServiceTypeDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.serviceTypesService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Roles(...WRITERS)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.serviceTypesService.remove(id, user.tenantId);
  }
}
