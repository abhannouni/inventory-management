import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { PlanVisitDto } from './plan-visit.dto';

/**
 * A reviewer writing somebody's whole month in one shot — the supervisor
 * "adjust and approve" action and the "plan a merchandiser's month" action are
 * the same operation, so they share this payload.
 */
export class SetMonthPlanDto {
  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 9 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ type: [PlanVisitDto], description: 'Full replacement list of planned visits for the month' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanVisitDto)
  visits: PlanVisitDto[];

  @ApiPropertyOptional({ description: 'Optional note explaining the change, shown to the plan owner' })
  @IsOptional()
  @IsString()
  note?: string;
}
