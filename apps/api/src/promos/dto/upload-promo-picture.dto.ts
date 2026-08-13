import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** The picture must already be uploaded via `POST /upload` — this just attaches the returned URL to a promo item. */
export class UploadPromoPictureDto {
  @ApiProperty({ example: '/uploads/abc123.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;
}
