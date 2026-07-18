import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SetFeatureFlagDto } from './dto/set-feature-flag.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('feature-flags')
  @RequirePermissions('settings.read')
  @ApiOperation({ summary: 'List all feature flags and their current state' })
  findAll() {
    return this.settingsService.findAllFlags();
  }

  @Patch('feature-flags/:key')
  @RequirePermissions('settings.update')
  @ApiOperation({ summary: 'Enable or disable a feature flag' })
  update(@Param('key') key: string, @Body() dto: SetFeatureFlagDto) {
    return this.settingsService.setEnabled(key, dto.enabled);
  }

  @Get('feature-flags/:key/status')
  @ApiOperation({
    summary:
      "Read a single flag's enabled state — open to any authenticated user, since non-admin flows (e.g. visit check-in) need to know it, not just admins",
  })
  async status(@Param('key') key: string) {
    return { key, enabled: await this.settingsService.isEnabled(key) };
  }
}
