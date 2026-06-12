import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Coca Cola 500ml' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'CC-500' })
  @IsString()
  sku: string;
}
