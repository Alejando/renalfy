import { Controller } from '@nestjs/common';
import { CashCloseService } from './cash-close.service.js';

@Controller('cash-close')
export class CashCloseController {
  constructor(private readonly cashCloseService: CashCloseService) {}
}
