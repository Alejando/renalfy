import { Controller, Get, Param } from '@nestjs/common';
import { PublicTenantsService } from './public-tenants.service.js';

@Controller('public/tenants')
export class PublicTenantsController {
  constructor(private readonly publicTenantsService: PublicTenantsService) {}

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.publicTenantsService.findBySlug(slug);
  }
}
