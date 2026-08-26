import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

/** `HH:mm`, 24-hour. Wall-clock at the point of sale, so no timezone attached. */
export const PLANNED_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** One day on a month plan — becomes a `Visit` row with `status = planned`. */
export class PlanVisitDto {
  @ApiProperty({ example: '2026-09-03', description: 'Day this visit is planned for' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'uuid-of-store' })
  @IsUUID()
  store_id: string;

  @ApiProperty({ example: '09:00', description: 'Time of day, HH:mm — one point of sale per slot' })
  @Matches(PLANNED_TIME_PATTERN, { message: 'time must be HH:mm, e.g. 09:00' })
  time: string;

  @ApiPropertyOptional({ example: 'Check seasonal display and shelf 3A' })
  @IsOptional()
  @IsString()
  notes?: string;
}
