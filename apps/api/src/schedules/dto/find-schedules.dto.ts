import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ScheduleStatus } from '@prisma/client';

export class FindSchedulesDto {
  @ApiPropertyOptional({ example: '2025-06', description: 'Filter by month in YYYY-MM format' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({ enum: ScheduleStatus })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @ApiPropertyOptional({ description: 'Filter by assigned user ID' })
  @IsOptional()
  @IsUUID()
  user_id?: string;
}
