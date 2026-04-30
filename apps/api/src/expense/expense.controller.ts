import { Controller } from '@nestjs/common';
import { ExpenseService } from './expense.service.js';

@Controller('expense')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}
}
