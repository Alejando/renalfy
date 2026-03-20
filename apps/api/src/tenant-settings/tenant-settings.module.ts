import { Module } from '@nestjs/common';
import { TenantSettingsService } from './tenant-settings.service.js';
import { TenantSettingsController } from './tenant-settings.controller.js';

@Module({
  controllers: [TenantSettingsController],
  providers: [TenantSettingsService],
})
export class TenantSettingsModule {}
