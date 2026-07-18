import { Prisma, User, UserRole } from '@prisma/client';

export type UserStoreReader = {
  userStore: { findMany: (args: unknown) => Promise<{ store_id: string }[]> };
};

/**
 * Store ids explicitly assigned to a user via `UserStore`, or `null` if none
 * exist. For an admin, a non-null result means their PDV list overrides the
 * region-wide default everywhere admin scope is checked.
 */
export async function adminAssignedStoreIds(
  prisma: UserStoreReader,
  userId: string,
): Promise<string[] | null> {
  const rows = await prisma.userStore.findMany({
    where: { user_id: userId },
    select: { store_id: true },
  });
  return rows.length ? rows.map((r) => r.store_id) : null;
}

/**
 * The single source of truth for **which points of sale a user may see**.
 *
 * Every list and every detail read runs through this, so scope is defined once
 * and can never drift between endpoints. Enforced on the server — the frontend
 * only ever renders what this returns.
 *
 *   super_admin        → every POS
 *   admin              → assigned PDVs if any exist, else their own region
 *   general_management → the POS the Super Admin has exposed (visible_to_gm)
 *   supervisor         → POS assigned to them (their team's stores)
 *   merchandiser       → POS assigned to them (their visit stores)
 *   anything else      → assigned POS only (least privilege by default)
 *
 * A `Prisma.StoreWhereInput` rather than a list of ids, so it composes with the
 * caller's own filters (search, city, chain, status) in one query.
 */
export async function visibleStoresWhere(
  prisma: UserStoreReader,
  user: User,
): Promise<Prisma.StoreWhereInput> {
  switch (user.role) {
    case UserRole.super_admin:
      return {};

    case UserRole.admin: {
      const assigned = await adminAssignedStoreIds(prisma, user.id);
      // An admin with no region and no assignment sees nothing, rather than everything.
      return assigned ? { id: { in: assigned } } : { region_id: user.region_id ?? '__no_region__' };
    }

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
  prisma: UserStoreReader & { store: { findFirst: (args: unknown) => Promise<{ id: string } | null> } },
  user: User,
  storeId: string,
): Promise<boolean> {
  const scope = await visibleStoresWhere(prisma, user);
  const found = await prisma.store.findFirst({
    where: { AND: [{ id: storeId }, scope] },
    select: { id: true },
  } as never);
  return !!found;
}
