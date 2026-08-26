import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, VisitPlanStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class FindVisitPlansDto {
  @ApiPropertyOptional({ enum: VisitPlanStatus })
  @IsOptional()
  @IsEnum(VisitPlanStatus)
  status?: VisitPlanStatus;

  @ApiPropertyOptional({ description: 'Filter by plan owner' })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    enum: [UserRole.supervisor, UserRole.merchandiser],
    description: 'Show only supervisors’ or only merchandisers’ months',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional({ example: 9 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: 'Search by owner name or email' })
  @IsOptional()
  @IsString()
  search?: string;
}
