import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { PriceSurveyNoteSide } from '@prisma/client';

export class SaveItemDto {
  @ApiProperty({ example: 'uuid-of-item' })
  @IsUUID()
  id: string;

  @ApiPropertyOptional({ example: 45.5 })
  @IsOptional()
  @IsNumber()
  price_normal?: number | null;

  @ApiPropertyOptional({ example: 39.9 })
  @IsOptional()
  @IsNumber()
  price_promo?: number | null;

  @ApiPropertyOptional({ example: 'OK' })
  @IsOptional()
  @IsString()
  etat?: string | null;

  @ApiPropertyOptional({ example: 'Marque X' })
  @IsOptional()
  @IsString()
  competitor_name?: string | null;

  @ApiPropertyOptional({ example: '75CL' })
  @IsOptional()
  @IsString()
  competitor_cl?: string | null;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsNumber()
  competitor_price_normal?: number | null;

  @ApiPropertyOptional({ example: 36 })
  @IsOptional()
  @IsNumber()
  competitor_price_promo?: number | null;

  @ApiPropertyOptional({ example: 'Rupture' })
  @IsOptional()
  @IsString()
  competitor_etat?: string | null;
}

export class SaveNoteDto {
  @ApiProperty({ example: 'mises_en_avant_alcool' })
  @IsString()
  section: string;

  @ApiProperty({ example: 'Frigo' })
  @IsString()
  sub_area: string;

  @ApiProperty({ enum: PriceSurveyNoteSide, example: PriceSurveyNoteSide.own })
  @IsEnum(PriceSurveyNoteSide)
  side: PriceSurveyNoteSide;

  @ApiPropertyOptional({ example: '3 facings mis en avant' })
  @IsOptional()
  @IsString()
  text?: string | null;
}

export class SaveSubmissionDto {
  @ApiProperty({ type: [SaveItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveItemDto)
  items: SaveItemDto[];

  @ApiProperty({ type: [SaveNoteDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveNoteDto)
  notes: SaveNoteDto[];
}
