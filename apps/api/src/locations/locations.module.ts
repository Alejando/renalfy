import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service.js';
import { LocationsController } from './locations.controller.js';
import { StockModule } from '../stock/stock.module.js';

@Module({
  imports: [StockModule],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
