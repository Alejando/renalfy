import {
  Controller,
  Get,
  Post,
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
import { ClinicalTemplatesService } from './clinical-templates.service.js';
import { UpsertClinicalTemplateDto } from './dto/upsert-clinical-template.dto.js';

const OWNERS_ADMINS: UserRole[] = ['OWNER', 'ADMIN'];

@UseGuards(JwtAuthGuard)
@Controller('clinical-templates')
export class ClinicalTemplatesController {
  constructor(
    private readonly clinicalTemplatesService: ClinicalTemplatesService,
  ) {}

  // US5: Crear o actualizar plantilla clínica (upsert)
  @Post()
  @Roles(...OWNERS_ADMINS)
  @Audit({ action: 'CREATE', resource: 'ClinicalTemplate' })
  @HttpCode(HttpStatus.OK)
  upsert(
    @Body() dto: UpsertClinicalTemplateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalTemplatesService.upsert(dto, user.tenantId);
  }

  // US5: Listar plantillas del tenant
  @Get()
  findAll(
    @Query('serviceTypeId') serviceTypeId: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.clinicalTemplatesService.findAll(user.tenantId, serviceTypeId);
  }

  // US5: Obtener plantilla por ID
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.clinicalTemplatesService.findOne(id, user.tenantId);
  }
}
