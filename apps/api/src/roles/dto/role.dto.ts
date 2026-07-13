import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'regional_auditor',
    description: 'Stable machine name — lowercase letters, digits and underscores only.',
  })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'name must be lowercase alphanumeric with underscores, starting with a letter',
  })
  @MaxLength(50)
  name: string;

  @ApiProperty({ example: 'Regional Auditor' })
  @IsString()
  @MaxLength(80)
  label: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Permission codes to grant on creation.',
    example: ['pos.read', 'reports.read'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  @IsOptional()
  permissions?: string[];
}

export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(80)
  label?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;
}

export class SetRolePermissionsDto {
  @ApiProperty({
    type: [String],
    description: 'The complete set of permission codes for this role. Replaces existing grants.',
    example: ['users.read', 'users.create', 'pos.read'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissions: string[];
}
