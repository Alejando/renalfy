import {
  Controller,
  Get,
  Post,
  Patch,
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
import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto.js';
import { CreateMeasurementDto } from './dto/create-measurement.dto.js';
import { AppointmentQueryDto } from './dto/appointment-query.dto.js';

const ALL_STAFF: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'];

@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // US1: Agendar una cita
  @Post()
  @Roles(...ALL_STAFF)
  @Audit({ action: 'CREATE', resource: 'Appointment' })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.create(
      dto,
      user.tenantId,
      user.userId,
      user.locationId,
    );
  }

  // US3: Consultar citas con filtros
  @Get()
  @Audit({ action: 'READ', resource: 'Appointment' })
  findAll(
    @Query() query: AppointmentQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.findAll(
      user.tenantId,
      user.locationId,
      query,
    );
  }

  // US3: Obtener cita con mediciones
  @Get(':id')
  @Audit({ action: 'READ', resource: 'Appointment' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.appointmentsService.findOne(id, user.tenantId, user.locationId);
  }

  // US2: Transicionar estado de una cita
  @Patch(':id/status')
  @Roles(...ALL_STAFF)
  @Audit({ action: 'UPDATE', resource: 'Appointment' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.updateStatus(
      id,
      dto,
      user.tenantId,
      user.locationId,
    );
  }

  // US4: Registrar medición durante sesión activa
  @Post(':id/measurements')
  @Roles(...ALL_STAFF)
  @Audit({ action: 'CREATE', resource: 'Measurement' })
  @HttpCode(HttpStatus.CREATED)
  createMeasurement(
    @Param('id') id: string,
    @Body() dto: CreateMeasurementDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.appointmentsService.createMeasurement(
      id,
      dto,
      user.tenantId,
      user.locationId,
    );
  }
}
