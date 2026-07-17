import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'John Smith' })
  @IsString()
  full_name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'secret1234', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    description:
      'Assign a custom role. Overrides `role` for permission checks; `role` stays as the legacy fallback.',
  })
  @IsUUID()
  @IsOptional()
  role_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-region' })
  @IsUUID()
  @IsOptional()
  region_id?: string;

  @ApiPropertyOptional({
    description: 'The supervisor managing this user (relevant for merchandisers).',
    example: 'uuid-of-supervisor',
  })
  @IsUUID()
  @IsOptional()
  supervisor_id?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
