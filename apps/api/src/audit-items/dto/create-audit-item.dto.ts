import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAuditItemDto {
  @ApiProperty({ example: 'uuid-of-visit' })
  @IsUUID()
  visit_id: string;

  @ApiProperty({ example: 'uuid-of-product' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ example: 18 })
  @IsInt()
  @Min(0)
  qty_found: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/photo.jpg' })
  @IsString()
  @IsOptional()
  photo_url?: string;

  @ApiPropertyOptional({ example: 'Shelf partially blocked' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: false, description: 'Whether this product currently has an in-store promotion' })
  @IsBoolean()
  @IsOptional()
  has_promo?: boolean;
}
