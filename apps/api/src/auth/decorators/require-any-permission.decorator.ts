import { SetMetadata } from '@nestjs/common';

export const ANY_PERMISSIONS_KEY = 'anyPermissions';

/**
 * Require at least one of the listed permission codes, instead of every one
 * of them (`RequirePermissions`'s AND semantics). Use this where a resource
 * is read as a side effect of an unrelated, already-permitted workflow —
 * e.g. the product catalog is read both by the Products page (`products.read`)
 * and by the audit-item picker for whoever can log audits (`audit_items.create`).
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);
