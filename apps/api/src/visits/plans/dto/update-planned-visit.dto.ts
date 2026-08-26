import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import { PLANNED_TIME_PATTERN } from './plan-visit.dto';

export class UpdatePlannedVisitDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  store_id?: string;

  @ApiPropertyOptional({ example: '09:00' })
  @IsOptional()
  @Matches(PLANNED_TIME_PATTERN, { message: 'time must be HH:mm, e.g. 09:00' })
  time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
