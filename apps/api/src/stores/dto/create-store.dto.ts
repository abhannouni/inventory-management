import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoreChannel, StoreClassification } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Optional leading +, then digits with spaces, dots, dashes or parentheses as
 * separators. Deliberately permissive: this is typed by field staff, and
 * rejecting a valid local format is worse than storing unusual spacing.
 */
export const PHONE_REGEX = /^\+?[0-9][0-9\s().-]{5,19}$/;

/** 3–10 alphanumerics with optional space/dash — covers MA, FR, UK, US formats. */
export const POSTAL_CODE_REGEX = /^[A-Za-z0-9][A-Za-z0-9\s-]{2,9}$/;

/**
 * Trim, and turn "" into undefined.
 *
 * The form posts every field it renders, so an untouched optional input arrives
 * as an empty string. Without this it would fail @IsEnum/@Matches instead of
 * simply being absent.
 */
const EmptyToUndefined = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  });

export class CreateStoreDto {
  @ApiProperty({ example: 'Marjane Californie' })
  @IsString()
  @MaxLength(120)
  name: string;

  // ── General information ────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'Marjane', description: 'Retail chain / brand' })
  @EmptyToUndefined()
  @IsString()
  @MaxLength(80)
  @IsOptional()
  brand?: string;

  @ApiPropertyOptional({ enum: StoreChannel })
  @EmptyToUndefined()
  @IsEnum(StoreChannel)
  @IsOptional()
  channel?: StoreChannel;

  @ApiPropertyOptional({ enum: StoreClassification })
  @EmptyToUndefined()
  @IsEnum(StoreClassification)
  @IsOptional()
  classification?: StoreClassification;

  // ── Address ────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: '12 Boulevard Zerktouni' })
  @EmptyToUndefined()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Casablanca' })
  @EmptyToUndefined()
  @IsString()
  @MaxLength(80)
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: '20250' })
  @EmptyToUndefined()
  @Matches(POSTAL_CODE_REGEX, { message: 'postal_code must be a valid postal code' })
  @IsOptional()
  postal_code?: string;

  @ApiProperty({ example: 'uuid-of-region' })
  @IsUUID()
  region_id: string;

  @ApiPropertyOptional({ example: '2019-04-12', description: 'ISO date (YYYY-MM-DD)' })
  @EmptyToUndefined()
  @IsDateString()
  @IsOptional()
  opening_date?: string;

  // ── Contacts ───────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 'Youssef Alami' })
  @EmptyToUndefined()
  @IsString()
  @MaxLength(120)
  @IsOptional()
  section_manager_name?: string;

  @ApiPropertyOptional({ example: '+212 661 234 567' })
  @EmptyToUndefined()
  @Matches(PHONE_REGEX, { message: 'section_manager_phone must be a valid phone number' })
  @IsOptional()
  section_manager_phone?: string;

  @ApiPropertyOptional({ example: 'Salma Bennis' })
  @EmptyToUndefined()
  @IsString()
  @MaxLength(120)
  @IsOptional()
  department_manager_name?: string;

  @ApiPropertyOptional({ example: '+212 662 345 678' })
  @EmptyToUndefined()
  @Matches(PHONE_REGEX, { message: 'department_manager_phone must be a valid phone number' })
  @IsOptional()
  department_manager_phone?: string;

  @ApiPropertyOptional({ example: 'Karim Idrissi' })
  @EmptyToUndefined()
  @IsString()
  @MaxLength(120)
  @IsOptional()
  gds_name?: string;

  @ApiPropertyOptional({ example: '+212 663 456 789' })
  @EmptyToUndefined()
  @Matches(PHONE_REGEX, { message: 'gds_phone must be a valid phone number' })
  @IsOptional()
  gds_phone?: string;

  // ── Geolocation ────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ example: 33.5731 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: -7.5898 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ example: 'https://maps.app.goo.gl/xxxx' })
  @EmptyToUndefined()
  @IsUrl({ require_protocol: true }, { message: 'google_maps_url must be a valid URL' })
  @MaxLength(2048)
  @IsOptional()
  google_maps_url?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether General Management may see this point of sale',
  })
  @IsBoolean()
  @IsOptional()
  visible_to_gm?: boolean;
}
