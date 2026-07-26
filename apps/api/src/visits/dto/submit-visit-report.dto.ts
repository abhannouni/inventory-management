import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { VisitReportCategory } from '@prisma/client';

export class VisitReportCardDto {
  @ApiProperty({ enum: VisitReportCategory, example: VisitReportCategory.tg })
  @IsEnum(VisitReportCategory)
  category: VisitReportCategory;

  @ApiPropertyOptional({ example: 'Le rayon est vide depuis ce matin.' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: ['https://.../photo1.jpg'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  photos: string[];
}

export class SubmitVisitReportDto {
  @ApiProperty({ type: [VisitReportCardDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => VisitReportCardDto)
  cards: VisitReportCardDto[];
}
