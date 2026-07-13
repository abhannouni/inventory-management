import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Base query parameters shared by every paginated admin list endpoint.
 * Extend this to add resource-specific filters.
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: DEFAULT_PAGE_SIZE, maximum: MAX_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({ description: 'Free-text search term' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ description: 'Column to sort by' })
  @IsOptional()
  @IsString()
  sort_by?: string;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_dir: 'asc' | 'desc' = 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const total_pages = Math.max(1, Math.ceil(total / limit));
  return {
    items,
    meta: {
      total,
      page,
      limit,
      total_pages,
      has_next: page < total_pages,
      has_prev: page > 1,
    },
  };
}

/** Translate page/limit into Prisma's skip/take. */
export function toSkipTake({ page, limit }: { page: number; limit: number }) {
  return { skip: (page - 1) * limit, take: limit };
}

/**
 * Build a Prisma `orderBy` from user input, refusing any column not explicitly
 * allowed — the sort column interpolates into the query, so it must never be
 * taken from the request unchecked.
 */
export function safeOrderBy<T extends string>(
  sortBy: string | undefined,
  sortDir: 'asc' | 'desc',
  allowed: readonly T[],
  fallback: Record<string, 'asc' | 'desc'>,
): Record<string, 'asc' | 'desc'> {
  if (sortBy && (allowed as readonly string[]).includes(sortBy)) {
    return { [sortBy]: sortDir };
  }
  return fallback;
}
