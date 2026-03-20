import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import type { UserRole } from '@repo/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator.js';
import { TenantSettingsService } from './tenant-settings.service.js';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto.js';

const SETTINGS_WRITERS: UserRole[] = ['OWNER'];

@UseGuards(JwtAuthGuard)
@Controller('tenant-settings')
export class TenantSettingsController {
  constructor(private readonly tenantSettingsService: TenantSettingsService) {}

  @Patch()
  @Roles(...SETTINGS_WRITERS)
  update(
    @Body() dto: UpdateTenantSettingsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.tenantSettingsService.update(dto, user.tenantId);
  }
}
