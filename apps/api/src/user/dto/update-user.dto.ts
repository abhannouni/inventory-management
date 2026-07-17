import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Smith' })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'newpassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Assign a custom role.' })
  @IsUUID()
  @IsOptional()
  role_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-region' })
  @IsUUID()
  @IsOptional()
  region_id?: string;

  @ApiPropertyOptional({
    description: 'The supervisor managing this user (relevant for merchandisers). Pass null to clear.',
    example: 'uuid-of-supervisor',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  supervisor_id?: string | null;
}
