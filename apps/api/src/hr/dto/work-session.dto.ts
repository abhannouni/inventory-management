import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
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
