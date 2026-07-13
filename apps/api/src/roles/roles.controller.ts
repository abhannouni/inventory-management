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
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateRoleDto, SetRolePermissionsDto, UpdateRoleDto } from './dto/role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'List all roles with user and permission counts' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions')
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'The full permission catalogue, grouped by resource' })
  catalogue() {
    return this.rolesService.catalogue();
  }

  @Get('roles/:id')
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'Get a role and its granted permission codes' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(id);
  }

  @Post('roles')
  @RequirePermissions('roles.create')
  @ApiOperation({ summary: 'Create a custom role' })
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch('roles/:id')
  @RequirePermissions('roles.update')
  @ApiOperation({ summary: 'Rename a role (machine name is immutable)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Put('roles/:id/permissions')
  @RequirePermissions('roles.assign_permissions')
  @ApiOperation({ summary: "Replace a role's permission set" })
  setPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.rolesService.setPermissions(id, dto);
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('roles.delete')
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.remove(id);
  }
}
