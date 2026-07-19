import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateAuditItemDto {
  @ApiPropertyOptional({ example: 20 })
  @IsInt()
  @Min(0)
  @IsOptional()
  qty_found?: number;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/photo.jpg' })
  @IsString()
  @IsOptional()
  photo_url?: string;

  @ApiPropertyOptional({ example: 'Updated note' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: false, description: 'Whether this product currently has an in-store promotion' })
  @IsBoolean()
  @IsOptional()
  has_promo?: boolean;
}
