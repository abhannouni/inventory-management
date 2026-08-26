import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

/** Filters for the reviewer's month-at-a-glance across everyone's plannings. */
export class FindAllPlannedDto {
  @ApiPropertyOptional({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiPropertyOptional({ example: 9 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiPropertyOptional({ enum: [UserRole.supervisor, UserRole.merchandiser] })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  /** Narrows merchandisers down to one supervisor's team. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supervisor_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({ description: 'Search by person name or email' })
  @IsOptional()
  @IsString()
  search?: string;
}
