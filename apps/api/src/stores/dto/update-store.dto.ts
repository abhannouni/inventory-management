import { PartialType } from '@nestjs/swagger';
import { CreateStoreDto } from './create-store.dto';

/**
 * Every field optional, but with exactly the same validation rules as create —
 * derived rather than duplicated, so the two forms can never drift apart.
 */
export class UpdateStoreDto extends PartialType(CreateStoreDto) {}
