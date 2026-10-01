import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CreateWorkSessionDto {
  @ApiProperty()
  @IsUUID()
  user_id: string;

  @ApiProperty({ example: '2026-09-30T09:00:00' })
  @IsDateString()
  clock_in: string;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Leave empty to record someone as still working',
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsDateString()
  clock_out?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdateWorkSessionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  clock_in?: string;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsDateString()
  clock_out?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class SessionSpanDto {
  @ApiProperty({ example: '2026-09-30T09:00:00' })
  @IsDateString()
  clock_in: string;

  @ApiProperty({ example: '2026-09-30T13:00:00' })
  @IsDateString()
  clock_out: string;
}

/** The same stretch(es) of time for several employees — e.g. a role's shift, split around its break. */
export class CreateWorkSessionsBulkDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  user_ids: string[];

  @ApiProperty({ type: [SessionSpanDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => SessionSpanDto)
  spans: SessionSpanDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
