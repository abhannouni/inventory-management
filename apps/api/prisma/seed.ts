import { AuditItemStatus, PrismaClient, VisitStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const HASH = (pw: string) => bcrypt.hash(pw, 10);

async function main() {
  console.log('🌱  Seeding database…');

  // ── 1. Clean ────────────────────────────────────────────────────────────────
  await prisma.auditItem.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.productStore.deleteMany();
  await prisma.userStore.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
  await prisma.region.deleteMany();

  // ── 2. Regions ──────────────────────────────────────────────────────────────
  const [north, south] = await Promise.all([
    prisma.region.create({ data: { name: 'North Region' } }),
    prisma.region.create({ data: { name: 'South Region' } }),
  ]);
  console.log('  ✔  regions');

  // ── 3. Users ────────────────────────────────────────────────────────────────
  const [superAdmin, adminNorth, adminSouth, supNorth, supSouth, merchNorth, merchSouth] =
    await Promise.all([
      prisma.user.create({
        data: {
          full_name: 'Super Admin',
          email: 'superadmin@example.com',
          password: await HASH('password123'),
          role: 'super_admin',
        },
      }),
      prisma.user.create({
        data: {
          full_name: 'Admin North',
          email: 'admin.north@example.com',
          password: await HASH('password123'),
          role: 'admin',
          region_id: north.id,
        },
      }),
      prisma.user.create({
        data: {
          full_name: 'Admin South',
          email: 'admin.south@example.com',
          password: await HASH('password123'),
          role: 'admin',
          region_id: south.id,
        },
      }),
      prisma.user.create({
        data: {
          full_name: 'Supervisor North',
          email: 'supervisor.north@example.com',
          password: await HASH('password123'),
          role: 'supervisor',
          region_id: north.id,
        },
      }),
      prisma.user.create({
        data: {
          full_name: 'Supervisor South',
          email: 'supervisor.south@example.com',
          password: await HASH('password123'),
          role: 'supervisor',
          region_id: south.id,
        },
      }),
      prisma.user.create({
        data: {
          full_name: 'Merchandiser North',
          email: 'merch.north@example.com',
          password: await HASH('password123'),
          role: 'merchandiser',
          region_id: north.id,
        },
      }),
      prisma.user.create({
        data: {
          full_name: 'Merchandiser South',
          email: 'merch.south@example.com',
          password: await HASH('password123'),
          role: 'merchandiser',
          region_id: south.id,
        },
      }),
    ]);
  console.log('  ✔  users');

  // ── 4. Stores ───────────────────────────────────────────────────────────────
  // Coordinates are within 200 m of each other so check-in radius tests pass
  const [storeN1, storeN2, storeS1, storeS2] = await Promise.all([
    prisma.store.create({
      data: {
        name: 'North Supermarket A',
        address: '12 Main St, North City',
        latitude: 34.052200,
        longitude: -118.243700,
        region_id: north.id,
      },
    }),
    prisma.store.create({
      data: {
        name: 'North Supermarket B',
        address: '34 Oak Ave, North City',
        latitude: 34.052800,
        longitude: -118.244100,
        region_id: north.id,
      },
    }),
    prisma.store.create({
      data: {
        name: 'South Market A',
        address: '5 Ocean Blvd, South City',
        latitude: 25.761700,
        longitude: -80.191800,
        region_id: south.id,
      },
    }),
    prisma.store.create({
      data: {
        name: 'South Market B',
        address: '77 Palm Dr, South City',
        latitude: 25.762200,
        longitude: -80.192300,
        region_id: south.id,
      },
    }),
  ]);
  console.log('  ✔  stores');

  // ── 5. UserStore assignments ─────────────────────────────────────────────────
  await prisma.userStore.createMany({
    data: [
      { user_id: supNorth.id,   store_id: storeN1.id },
      { user_id: supNorth.id,   store_id: storeN2.id },
      { user_id: supSouth.id,   store_id: storeS1.id },
      { user_id: supSouth.id,   store_id: storeS2.id },
      { user_id: merchNorth.id, store_id: storeN1.id },
      { user_id: merchNorth.id, store_id: storeN2.id },
      { user_id: merchSouth.id, store_id: storeS1.id },
      { user_id: merchSouth.id, store_id: storeS2.id },
    ],
  });
  console.log('  ✔  user_stores');

  // ── 6. Products ──────────────────────────────────────────────────────────────
  const productDefs = [
    { name: 'Milk 1L',      sku: 'MLK-001' },
    { name: 'White Bread',  sku: 'BRD-001' },
    { name: 'Orange Juice', sku: 'OJ-001'  },
    { name: 'Yogurt 500g',  sku: 'YGT-001' },
    { name: 'Cheddar Cheese', sku: 'CHS-001' },
  ];

  const products = await Promise.all(
    productDefs.map((p) => prisma.product.create({ data: p })),
  );
  console.log('  ✔  products');

  // ── 7. ProductStore (expected quantities per store) ──────────────────────────
  const allStores = [storeN1, storeN2, storeS1, storeS2];
  const expectedQtys = [50, 40, 30, 20, 60]; // one per product

  await prisma.productStore.createMany({
    data: allStores.flatMap((store) =>
      products.map((product, i) => ({
        product_id: product.id,
        store_id: store.id,
        expected_qty: expectedQtys[i],
      })),
    ),
  });
  console.log('  ✔  product_stores');

  // ── 8. Visits (2 completed + 1 open) ────────────────────────────────────────
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);

  const [visitCompleted1, visitCompleted2, visitOpen] = await Promise.all([
    // completed — supervisor north, store N1, yesterday
    prisma.visit.create({
      data: {
        user_id: supNorth.id,
        store_id: storeN1.id,
        status: VisitStatus.completed,
        checkin_time: hoursAgo(26),
        checkin_lat: 34.052210,
        checkin_lng: -118.243710,
        checkout_time: hoursAgo(24),
        checkout_lat: 34.052210,
        checkout_lng: -118.243710,
      },
    }),
    // completed — merchandiser south, store S1
    prisma.visit.create({
      data: {
        user_id: merchSouth.id,
        store_id: storeS1.id,
        status: VisitStatus.completed,
        checkin_time: hoursAgo(10),
        checkin_lat: 25.761710,
        checkin_lng: -80.191810,
        checkout_time: hoursAgo(8),
        checkout_lat: 25.761710,
        checkout_lng: -80.191810,
      },
    }),
    // open — merchandiser north, store N2 (no checkout yet)
    prisma.visit.create({
      data: {
        user_id: merchNorth.id,
        store_id: storeN2.id,
        status: VisitStatus.open,
        checkin_time: hoursAgo(1),
        checkin_lat: 34.052810,
        checkin_lng: -118.244110,
      },
    }),
  ]);
  console.log('  ✔  visits');

  // ── 9. AuditItems for completed visits ───────────────────────────────────────
  const makeAuditItems = (
    visitId: string,
    qtysFound: number[],
    expectedQtysLocal: number[],
  ) =>
    products.map((product, i) => {
      const qtyFound = qtysFound[i];
      const expectedQty = expectedQtysLocal[i];
      const variance = qtyFound - expectedQty;
      const status: AuditItemStatus =
        qtyFound === 0
          ? AuditItemStatus.out_of_stock
          : qtyFound < expectedQty * 0.5
            ? AuditItemStatus.low_stock
            : AuditItemStatus.in_stock;
      return { visit_id: visitId, product_id: product.id, qty_found: qtyFound, expected_qty: expectedQty, variance, status };
    });

  await prisma.auditItem.createMany({
    data: [
      ...makeAuditItems(visitCompleted1.id, [48, 38, 30, 10, 58], expectedQtys),
      ...makeAuditItems(visitCompleted2.id, [0,  40, 15, 20, 55], expectedQtys),
    ],
  });
  console.log('  ✔  audit_items');

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n✅  Seed complete!\n');
  console.log('  Credentials (all passwords: password123)');
  console.log('  ┌────────────────────────────────────┬─────────────────┐');
  console.log('  │ Email                               │ Role            │');
  console.log('  ├────────────────────────────────────┼─────────────────┤');
  console.log(`  │ ${superAdmin.email.padEnd(36)} │ super_admin     │`);
  console.log(`  │ ${adminNorth.email.padEnd(36)} │ admin           │`);
  console.log(`  │ ${adminSouth.email.padEnd(36)} │ admin           │`);
  console.log(`  │ ${supNorth.email.padEnd(36)} │ supervisor      │`);
  console.log(`  │ ${supSouth.email.padEnd(36)} │ supervisor      │`);
  console.log(`  │ ${merchNorth.email.padEnd(36)} │ merchandiser    │`);
  console.log(`  │ ${merchSouth.email.padEnd(36)} │ merchandiser    │`);
  console.log('  └────────────────────────────────────┴─────────────────┘');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
