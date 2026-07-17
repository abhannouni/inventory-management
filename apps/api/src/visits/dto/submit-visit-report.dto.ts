import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitVisitReportDto {
  @ApiProperty({ example: 'Rupture rayon lait' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Le rayon est vide depuis ce matin.' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: ['https://.../photo1.jpg'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  photos: string[];
}
