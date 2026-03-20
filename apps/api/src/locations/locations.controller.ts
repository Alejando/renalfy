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
import { LocationsService } from './locations.service.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';

const LOCATION_MANAGERS: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'];
const LOCATION_WRITERS: UserRole[] = ['OWNER', 'ADMIN'];

@UseGuards(JwtAuthGuard)
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @Roles(...LOCATION_WRITERS)
  create(
    @Body() dto: CreateLocationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.locationsService.create(dto, user.tenantId);
  }

  @Get()
  @Roles(...LOCATION_MANAGERS)
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.locationsService.findAll(user.tenantId, user.locationId);
  }

  @Get(':id')
  @Roles(...LOCATION_MANAGERS)
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.locationsService.findOne(id, user.tenantId, user.locationId);
  }

  @Patch(':id')
  @Roles(...LOCATION_WRITERS)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.locationsService.update(id, dto, user.tenantId);
  }

  @Delete(':id')
  @Roles(...LOCATION_WRITERS)
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.locationsService.remove(id, user.tenantId);
  }
}
