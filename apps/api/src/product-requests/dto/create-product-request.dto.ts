import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsNotEmpty, IsNumber, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateProductRequestDto {
  @ApiProperty({ example: 'uuid-of-store' })
  @IsUUID()
  store_id: string;

  @ApiProperty({ example: 'Yaourts', description: 'Product sub-family (Sous Famille)' })
  @IsString()
  @IsNotEmpty()
  sous_famille: string;

  @ApiProperty({ example: 40, description: 'Width in centimeters' })
  @IsNumber()
  @IsPositive()
  width: number;

  @ApiProperty({ example: 180, description: 'Height in centimeters' })
  @IsNumber()
  @IsPositive()
  height: number;

  @ApiProperty({ example: 50, description: 'Depth in centimeters' })
  @IsNumber()
  @IsPositive()
  depth: number;

  @ApiProperty({
    example: ['/uploads/abc123.jpg'],
    description: 'URLs returned by POST /upload — 1 to 5 photos',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  image_urls: string[];
}
