import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FindAssignmentsDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ example: 'uuid-of-store' })
  @IsUUID()
  store_id: string;
}
