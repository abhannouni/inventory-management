import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export const USER_SORT_FIELDS = [
  'full_name',
  'email',
  'role',
  'is_active',
  'created_at',
  'last_login_at',
] as const;

export class ListUsersDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  region_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @ApiPropertyOptional({ description: "Filter to a supervisor's direct team" })
  @IsOptional()
  @IsUUID()
  supervisor_id?: string;

  @ApiPropertyOptional({ description: 'Filter by account status' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  is_active?: boolean;
}
