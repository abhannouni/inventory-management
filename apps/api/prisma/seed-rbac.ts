import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { syncRbac } from './rbac';

/**
 * Non-destructive: syncs roles/permissions into an existing database.
 * Run with `pnpm db:seed:rbac`.
 */
const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

syncRbac(prisma)
  .then(({ permissions, roles }) => {
    console.log(`✅  RBAC synced — ${permissions} permissions across ${roles} roles.`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
