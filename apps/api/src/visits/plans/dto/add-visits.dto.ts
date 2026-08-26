import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PlanVisitDto } from './plan-visit.dto';

/** A reviewer adding days to somebody's month, without rewriting what is there. */
export class AddPlannedVisitsDto {
  @ApiProperty({ type: [PlanVisitDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PlanVisitDto)
  visits: PlanVisitDto[];

  @ApiPropertyOptional({ description: 'Optional note shown to the person the month belongs to' })
  @IsOptional()
  @IsString()
  note?: string;
}
