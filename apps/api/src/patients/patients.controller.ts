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
import { Audit } from '../common/decorators/audit.decorator.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator.js';
import { PatientsService } from './patients.service.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { PatientQueryDto } from './dto/patient-query.dto.js';

const ALL_STAFF: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'];
const OWNERS_ADMINS: UserRole[] = ['OWNER', 'ADMIN'];

@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(...ALL_STAFF)
  @Audit({ action: 'CREATE', resource: 'Patient' })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreatePatientDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.create(dto, user.tenantId, user.locationId);
  }

  @Get()
  @Audit({ action: 'READ', resource: 'Patient' })
  findAll(
    @Query() query: PatientQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.findAll(user.tenantId, user.locationId, query);
  }

  @Get(':id')
  @Audit({ action: 'READ', resource: 'Patient' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.findOne(id, user.tenantId, user.locationId);
  }

  @Patch(':id')
  @Roles(...ALL_STAFF)
  @Audit({ action: 'UPDATE', resource: 'Patient' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.patientsService.update(id, dto, user.tenantId, user.locationId);
  }

  @Delete(':id')
  @Roles(...OWNERS_ADMINS)
  @Audit({ action: 'DELETE', resource: 'Patient' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.patientsService.remove(id, user.tenantId);
  }
}
