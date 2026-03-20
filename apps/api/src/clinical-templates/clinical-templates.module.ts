import { Module } from '@nestjs/common';
import { ClinicalTemplatesController } from './clinical-templates.controller.js';
import { ClinicalTemplatesService } from './clinical-templates.service.js';

@Module({
  controllers: [ClinicalTemplatesController],
  providers: [ClinicalTemplatesService],
})
export class ClinicalTemplatesModule {}
