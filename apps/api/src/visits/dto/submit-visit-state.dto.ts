import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

/** Shared shape for the merchandiser's "before" (initial) and "after" (final) shelf state. */
export class SubmitVisitStateDto {
  @ApiPropertyOptional({ example: 'Rayon bien rangé au départ.' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ example: ['https://.../photo1.jpg'], type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  photos: string[];
}
