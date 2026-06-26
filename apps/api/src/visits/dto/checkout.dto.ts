import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ example: 'uuid-of-visit' })
  @IsUUID()
  visit_id: string;

  @ApiProperty({ example: 34.052200 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: -118.243700 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @ApiPropertyOptional({ example: '2026-06-25T11:18:00.924Z' })
  @IsOptional()
  @IsDateString()
  checkout_at?: string;
}
