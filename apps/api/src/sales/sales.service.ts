import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}
}
