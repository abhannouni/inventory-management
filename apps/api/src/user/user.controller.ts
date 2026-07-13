import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AssignStoresDto } from './dto/assign-stores.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'List users (paginated, searchable, filterable)' })
  findAll(@Query() query: ListUsersDto) {
    return this.userService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get a user with their assigned points of sale' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Create a user' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Update a user' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Patch(':id/activate')
  @RequirePermissions('users.activate')
  @ApiOperation({ summary: 'Reactivate a user account' })
  activate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: User) {
    return this.userService.setActive(id, true, actor.id);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('users.activate')
  @ApiOperation({
    summary: 'Deactivate a user account — revokes their existing sessions immediately',
  })
  deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: User) {
    return this.userService.setActive(id, false, actor.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('users.delete')
  @ApiOperation({ summary: 'Delete a user permanently' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: User) {
    return this.userService.remove(id, actor.id);
  }

  @Post(':id/stores')
  @RequirePermissions('users.assign_stores')
  @ApiOperation({ summary: 'Replace all point-of-sale assignments for a user' })
  assignStores(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignStoresDto) {
    return this.userService.assignStores(id, dto);
  }
}
