import { ApiPropertyOptional } from '@nestjs/swagger';
import { VisitStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ReportFiltersDto {
  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional({ enum: VisitStatus })
  @IsEnum(VisitStatus)
  @IsOptional()
  status?: VisitStatus;

  @ApiPropertyOptional({ example: 'uuid-of-store' })
  @IsUUID()
  @IsOptional()
  store_id?: string;
}
