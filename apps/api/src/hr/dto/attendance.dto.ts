import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { VisitLocationScope } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export const MIN_RADIUS_METERS = 20;
export const MAX_RADIUS_METERS = 5000;

/** Device position sent with a clock-in / clock-out. Both optional: a refused or failed GPS still clocks. */
export class ClockPositionDto {
  @ApiPropertyOptional({ example: 33.5731 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ example: -7.5898 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}

export class CreateWorkLocationDto {
  @ApiProperty({ example: 'Casablanca agency' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiProperty({ example: 33.5731 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -7.5898 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ default: 150 })
  @IsOptional()
  @IsInt()
  @Min(MIN_RADIUS_METERS)
  @Max(MAX_RADIUS_METERS)
  radius_meters?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateWorkLocationDto extends PartialType(CreateWorkLocationDto) {}

export class SetAttendancePolicyDto {
  @ApiProperty({ description: 'Check where this employee clocks their time' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: 'The work locations in `work_location_ids` are valid',
  })
  @IsBoolean()
  allow_work_locations: boolean;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  work_location_ids: string[];

  @ApiProperty({ description: "A visit's store is valid around that visit" })
  @IsBoolean()
  allow_visit_stores: boolean;

  @ApiProperty({ enum: VisitLocationScope })
  @IsEnum(VisitLocationScope)
  visit_scope: VisitLocationScope;

  @ApiProperty({
    description: 'Minutes before/after a visit its store still counts',
  })
  @IsInt()
  @Min(0)
  @Max(240)
  visit_margin_minutes: number;

  @ApiProperty({ description: 'Any store assigned to the employee is valid' })
  @IsBoolean()
  allow_assigned_stores: boolean;

  @ApiProperty()
  @IsInt()
  @Min(MIN_RADIUS_METERS)
  @Max(MAX_RADIUS_METERS)
  store_radius_meters: number;

  @ApiProperty({
    description: 'Time clocked away from every valid place still counts',
  })
  @IsBoolean()
  count_off_site: boolean;

  @ApiProperty({ description: 'Time with no recorded position still counts' })
  @IsBoolean()
  count_unverified: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
