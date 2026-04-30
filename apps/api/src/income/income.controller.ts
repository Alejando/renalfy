import { Controller } from '@nestjs/common';
import { IncomeService } from './income.service.js';

@Controller('income')
export class IncomeController {
  constructor(private readonly incomeService: IncomeService) {}
}
