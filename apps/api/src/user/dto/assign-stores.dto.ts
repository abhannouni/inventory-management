import { IsArray, IsUUID } from 'class-validator';

export class AssignStoresDto {
  @IsArray()
  @IsUUID('4', { each: true })
  store_ids: string[];
}
