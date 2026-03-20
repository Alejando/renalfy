import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import type { UserRole } from '@repo/types';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../common/decorators/current-user.decorator.js';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';

const USER_WRITERS: UserRole[] = ['OWNER', 'ADMIN'];
const USER_READERS: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER'];

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(...USER_WRITERS)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.create(dto, user.tenantId, user.role as UserRole);
  }

  @Get()
  @Roles(...USER_READERS)
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findAll(user.tenantId, user.locationId);
  }

  @Get(':id')
  @Roles(...USER_READERS)
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findOne(id, user.tenantId, user.locationId);
  }

  @Patch(':id')
  @Roles(...USER_WRITERS)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.update(id, dto, user.tenantId);
  }

  @Patch(':id/status')
  @Roles(...USER_WRITERS)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.updateStatus(
      id,
      dto.status,
      user.tenantId,
      user.role as UserRole,
    );
  }
}
