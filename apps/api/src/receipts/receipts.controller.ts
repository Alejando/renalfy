import {
  Controller,
  Get,
  Post,
  Patch,
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
import { ReceiptsService } from './receipts.service.js';
import { CreateReceiptDto } from './dto/create-receipt.dto.js';
import { UpdateReceiptStatusDto } from './dto/update-receipt-status.dto.js';
import { ReceiptQueryDto } from './dto/receipt-query.dto.js';

const ALL_STAFF: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'STAFF'];

@UseGuards(JwtAuthGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  // US1: Crear recibo con folio atómico
  @Post()
  @Roles(...ALL_STAFF)
  @Audit({ action: 'CREATE', resource: 'Receipt' })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateReceiptDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.receiptsService.create(
      dto,
      user.tenantId,
      user.userId,
      user.locationId,
    );
  }

  // US2: Transicionar estado de un recibo
  @Patch(':id/status')
  @Roles(...ALL_STAFF)
  @Audit({ action: 'UPDATE', resource: 'Receipt' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReceiptStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.receiptsService.updateStatus(
      id,
      dto,
      user.tenantId,
      user.locationId,
    );
  }

  // US4: Listar recibos con filtros
  @Get()
  @Audit({ action: 'READ', resource: 'Receipt' })
  findAll(
    @Query() query: ReceiptQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.receiptsService.findAll(user.tenantId, user.locationId, query);
  }

  // US4: Obtener recibo por ID
  @Get(':id')
  @Audit({ action: 'READ', resource: 'Receipt' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.receiptsService.findOne(id, user.tenantId, user.locationId);
  }
}
