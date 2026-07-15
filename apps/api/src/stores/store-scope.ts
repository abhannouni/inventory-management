import { Prisma, User, UserRole } from '@prisma/client';

/**
 * The single source of truth for **which points of sale a user may see**.
 *
 * Every list and every detail read runs through this, so scope is defined once
 * and can never drift between endpoints. Enforced on the server — the frontend
 * only ever renders what this returns.
 *
 *   super_admin        → every POS
 *   admin              → POS in their own region
 *   general_management → the POS the Super Admin has exposed (visible_to_gm)
 *   supervisor         → POS assigned to them (their team's stores)
 *   merchandiser       → POS assigned to them (their visit stores)
 *   anything else      → assigned POS only (least privilege by default)
 *
 * A `Prisma.StoreWhereInput` rather than a list of ids, so it composes with the
 * caller's own filters (search, city, chain, status) in one query.
 */
export function visibleStoresWhere(user: User): Prisma.StoreWhereInput {
  switch (user.role) {
    case UserRole.super_admin:
      return {};

    case UserRole.admin:
      // An admin with no region assigned sees nothing, rather than everything.
      return { region_id: user.region_id ?? '__no_region__' };

    case UserRole.general_management:
      return { visible_to_gm: true };

    case UserRole.supervisor:
    case UserRole.merchandiser:
    default:
      return { userStores: { some: { user_id: user.id } } };
  }
}

/** Does this user's scope include the given store? Used before any detail read. */
export async function assertStoreVisible(
  prisma: { store: { findFirst: (args: unknown) => Promise<{ id: string } | null> } },
  user: User,
  storeId: string,
): Promise<boolean> {
  const found = await prisma.store.findFirst({
    where: { AND: [{ id: storeId }, visibleStoresWhere(user)] },
    select: { id: true },
  } as never);
  return !!found;
}
