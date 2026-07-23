import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsPositive, IsString, IsUUID } from 'class-validator';

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

  @ApiProperty({ example: '/uploads/abc123.jpg', description: 'URL returned by POST /upload' })
  @IsString()
  @IsNotEmpty()
  image_url: string;
}
