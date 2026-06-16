import { AuditItemStatus, PrismaClient, ScheduleStatus, VisitStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const HASH = (pw: string) => bcrypt.hash(pw, 10);

/** Return a Date at a specific offset from today at the given hour */
const dt = (offsetDays: number, hour = 10, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
};

async function main() {
  console.log('🌱  Seeding database…');

  // ── 1. Clean ────────────────────────────────────────────────────────────────
  await prisma.schedule.deleteMany();
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

  // ── 3. Users (same as before) ────────────────────────────────────────────────
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

  // ── 4. Stores (6 total — 3 per region) ──────────────────────────────────────
  const [storeN1, storeN2, storeN3, storeS1, storeS2, storeS3] = await Promise.all([
    prisma.store.create({
      data: {
        name: 'Marjane North',
        address: '12 Main St, North City',
        latitude: 34.052200,
        longitude: -118.243700,
        region_id: north.id,
      },
    }),
    prisma.store.create({
      data: {
        name: 'Carrefour North',
        address: '34 Oak Ave, North City',
        latitude: 34.052800,
        longitude: -118.244100,
        region_id: north.id,
      },
    }),
    prisma.store.create({
      data: {
        name: 'Label Vie North',
        address: '89 Elm Rd, North City',
        latitude: 34.053100,
        longitude: -118.244400,
        region_id: north.id,
      },
    }),
    prisma.store.create({
      data: {
        name: 'Marjane South',
        address: '5 Ocean Blvd, South City',
        latitude: 25.761700,
        longitude: -80.191800,
        region_id: south.id,
      },
    }),
    prisma.store.create({
      data: {
        name: 'Carrefour South',
        address: '77 Palm Dr, South City',
        latitude: 25.762200,
        longitude: -80.192300,
        region_id: south.id,
      },
    }),
    prisma.store.create({
      data: {
        name: 'BIM South',
        address: '14 Coral Way, South City',
        latitude: 25.762600,
        longitude: -80.192700,
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
      { user_id: supNorth.id,   store_id: storeN3.id },
      { user_id: supSouth.id,   store_id: storeS1.id },
      { user_id: supSouth.id,   store_id: storeS2.id },
      { user_id: supSouth.id,   store_id: storeS3.id },
      { user_id: merchNorth.id, store_id: storeN1.id },
      { user_id: merchNorth.id, store_id: storeN2.id },
      { user_id: merchNorth.id, store_id: storeN3.id },
      { user_id: merchSouth.id, store_id: storeS1.id },
      { user_id: merchSouth.id, store_id: storeS2.id },
      { user_id: merchSouth.id, store_id: storeS3.id },
    ],
  });
  console.log('  ✔  user_stores');

  // ── 6. Products (10 total) ───────────────────────────────────────────────────
  const productDefs = [
    { name: 'Milk 1L',           sku: 'MLK-001' },
    { name: 'White Bread',       sku: 'BRD-001' },
    { name: 'Orange Juice 1L',   sku: 'OJ-001'  },
    { name: 'Yogurt 500g',       sku: 'YGT-001' },
    { name: 'Cheddar Cheese',    sku: 'CHS-001' },
    { name: 'Butter 250g',       sku: 'BTR-001' },
    { name: 'Eggs 12pk',         sku: 'EGG-001' },
    { name: 'Coffee 500g',       sku: 'CFE-001' },
    { name: 'Sugar 1kg',         sku: 'SGR-001' },
    { name: 'Mineral Water 1.5L',sku: 'WAT-001' },
  ];

  const products = await Promise.all(
    productDefs.map((p) => prisma.product.create({ data: p })),
  );
  console.log('  ✔  products');

  // ── 7. ProductStore (expected quantities) ───────────────────────────────────
  const allStores = [storeN1, storeN2, storeN3, storeS1, storeS2, storeS3];
  // expected qty per product (same across stores for simplicity)
  const expectedQtys = [60, 40, 35, 25, 20, 30, 50, 15, 45, 80];

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

  // ── 8. Visits — 22 visits over the past 30 days ─────────────────────────────
  //
  // Pattern: merchandisers visit 2–3 stores per week, supervisors occasionally.
  //
  type VisitSeed = {
    user_id: string; store_id: string; checkin_time: Date;
    checkout_time?: Date; checkin_lat: number; checkin_lng: number;
    checkout_lat?: number; checkout_lng?: number; status: VisitStatus;
  };

  const visitData: VisitSeed[] = [
    // ── 4 weeks ago ──────────────────────────────────────────
    { user_id: merchNorth.id, store_id: storeN1.id, status: VisitStatus.completed,
      checkin_time: dt(-28, 8), checkout_time: dt(-28, 10, 30),
      checkin_lat: 34.052210, checkin_lng: -118.243710,
      checkout_lat: 34.052210, checkout_lng: -118.243710 },
    { user_id: merchNorth.id, store_id: storeN2.id, status: VisitStatus.completed,
      checkin_time: dt(-27, 9), checkout_time: dt(-27, 11),
      checkin_lat: 34.052810, checkin_lng: -118.244110,
      checkout_lat: 34.052810, checkout_lng: -118.244110 },
    { user_id: merchSouth.id, store_id: storeS1.id, status: VisitStatus.completed,
      checkin_time: dt(-28, 8, 30), checkout_time: dt(-28, 11),
      checkin_lat: 25.761710, checkin_lng: -80.191810,
      checkout_lat: 25.761710, checkout_lng: -80.191810 },
    { user_id: merchSouth.id, store_id: storeS2.id, status: VisitStatus.completed,
      checkin_time: dt(-26, 9), checkout_time: dt(-26, 12),
      checkin_lat: 25.762210, checkin_lng: -80.192310,
      checkout_lat: 25.762210, checkout_lng: -80.192310 },

    // ── 3 weeks ago ──────────────────────────────────────────
    { user_id: supNorth.id, store_id: storeN3.id, status: VisitStatus.completed,
      checkin_time: dt(-21, 10), checkout_time: dt(-21, 12, 30),
      checkin_lat: 34.053110, checkin_lng: -118.244410,
      checkout_lat: 34.053110, checkout_lng: -118.244410 },
    { user_id: merchNorth.id, store_id: storeN3.id, status: VisitStatus.completed,
      checkin_time: dt(-20, 8), checkout_time: dt(-20, 10),
      checkin_lat: 34.053110, checkin_lng: -118.244410,
      checkout_lat: 34.053110, checkout_lng: -118.244410 },
    { user_id: merchNorth.id, store_id: storeN1.id, status: VisitStatus.completed,
      checkin_time: dt(-19, 9), checkout_time: dt(-19, 11, 30),
      checkin_lat: 34.052210, checkin_lng: -118.243710,
      checkout_lat: 34.052210, checkout_lng: -118.243710 },
    { user_id: merchSouth.id, store_id: storeS3.id, status: VisitStatus.completed,
      checkin_time: dt(-21, 8), checkout_time: dt(-21, 10, 30),
      checkin_lat: 25.762610, checkin_lng: -80.192710,
      checkout_lat: 25.762610, checkout_lng: -80.192710 },
    { user_id: supSouth.id, store_id: storeS1.id, status: VisitStatus.completed,
      checkin_time: dt(-20, 11), checkout_time: dt(-20, 13),
      checkin_lat: 25.761710, checkin_lng: -80.191810,
      checkout_lat: 25.761710, checkout_lng: -80.191810 },

    // ── 2 weeks ago ──────────────────────────────────────────
    { user_id: merchNorth.id, store_id: storeN2.id, status: VisitStatus.completed,
      checkin_time: dt(-14, 9), checkout_time: dt(-14, 11),
      checkin_lat: 34.052810, checkin_lng: -118.244110,
      checkout_lat: 34.052810, checkout_lng: -118.244110 },
    { user_id: merchNorth.id, store_id: storeN3.id, status: VisitStatus.completed,
      checkin_time: dt(-13, 8, 30), checkout_time: dt(-13, 10, 30),
      checkin_lat: 34.053110, checkin_lng: -118.244410,
      checkout_lat: 34.053110, checkout_lng: -118.244410 },
    { user_id: merchSouth.id, store_id: storeS1.id, status: VisitStatus.completed,
      checkin_time: dt(-15, 9), checkout_time: dt(-15, 12),
      checkin_lat: 25.761710, checkin_lng: -80.191810,
      checkout_lat: 25.761710, checkout_lng: -80.191810 },
    { user_id: merchSouth.id, store_id: storeS2.id, status: VisitStatus.completed,
      checkin_time: dt(-13, 8), checkout_time: dt(-13, 10),
      checkin_lat: 25.762210, checkin_lng: -80.192310,
      checkout_lat: 25.762210, checkout_lng: -80.192310 },
    { user_id: supNorth.id, store_id: storeN1.id, status: VisitStatus.completed,
      checkin_time: dt(-12, 10), checkout_time: dt(-12, 12),
      checkin_lat: 34.052210, checkin_lng: -118.243710,
      checkout_lat: 34.052210, checkout_lng: -118.243710 },

    // ── Last week ─────────────────────────────────────────────
    { user_id: merchNorth.id, store_id: storeN1.id, status: VisitStatus.completed,
      checkin_time: dt(-7, 8), checkout_time: dt(-7, 10, 30),
      checkin_lat: 34.052210, checkin_lng: -118.243710,
      checkout_lat: 34.052210, checkout_lng: -118.243710 },
    { user_id: merchNorth.id, store_id: storeN2.id, status: VisitStatus.completed,
      checkin_time: dt(-6, 9), checkout_time: dt(-6, 11),
      checkin_lat: 34.052810, checkin_lng: -118.244110,
      checkout_lat: 34.052810, checkout_lng: -118.244110 },
    { user_id: supSouth.id, store_id: storeS2.id, status: VisitStatus.completed,
      checkin_time: dt(-7, 9, 30), checkout_time: dt(-7, 11, 30),
      checkin_lat: 25.762210, checkin_lng: -80.192310,
      checkout_lat: 25.762210, checkout_lng: -80.192310 },
    { user_id: merchSouth.id, store_id: storeS3.id, status: VisitStatus.completed,
      checkin_time: dt(-5, 8), checkout_time: dt(-5, 10, 30),
      checkin_lat: 25.762610, checkin_lng: -80.192710,
      checkout_lat: 25.762610, checkout_lng: -80.192710 },

    // ── This week ─────────────────────────────────────────────
    { user_id: merchNorth.id, store_id: storeN3.id, status: VisitStatus.completed,
      checkin_time: dt(-2, 9), checkout_time: dt(-2, 11, 30),
      checkin_lat: 34.053110, checkin_lng: -118.244410,
      checkout_lat: 34.053110, checkout_lng: -118.244410 },
    { user_id: merchSouth.id, store_id: storeS1.id, status: VisitStatus.completed,
      checkin_time: dt(-1, 8, 30), checkout_time: dt(-1, 10, 30),
      checkin_lat: 25.761710, checkin_lng: -80.191810,
      checkout_lat: 25.761710, checkout_lng: -80.191810 },

    // ── Currently open (no checkout) ──────────────────────────
    { user_id: merchSouth.id, store_id: storeS2.id, status: VisitStatus.open,
      checkin_time: dt(0, 9), checkin_lat: 25.762210, checkin_lng: -80.192310 },
  ];

  const visits = await Promise.all(
    visitData.map((v) => prisma.visit.create({ data: v })),
  );
  console.log('  ✔  visits');

  // ── 9. AuditItems — for every completed visit ────────────────────────────────
  const makeAuditItems = (visitId: string, qtysFound: number[]) =>
    products.map((product, i) => {
      const qtyFound     = qtysFound[i];
      const expectedQty  = expectedQtys[i];
      const variance     = qtyFound - expectedQty;
      const status: AuditItemStatus =
        qtyFound === 0                    ? AuditItemStatus.out_of_stock
        : qtyFound < expectedQty * 0.5   ? AuditItemStatus.low_stock
        :                                   AuditItemStatus.in_stock;
      return { visit_id: visitId, product_id: product.id, qty_found: qtyFound, expected_qty: expectedQty, variance, status };
    });

  // Realistic qty patterns per visit (10 products each)
  const qtyProfiles: number[][] = [
    [58, 38, 34, 24, 19, 28, 48, 14, 43, 78],  // v0  almost full
    [55, 35, 30, 22, 18, 25, 45, 12, 40, 75],  // v1
    [60, 40, 35, 25, 20, 30, 50, 15, 45, 80],  // v2  full
    [40, 20, 10, 5,  10, 15, 30, 7,  20, 50],  // v3  mixed low
    [58, 39, 33, 23, 18, 28, 48, 13, 42, 77],  // v4
    [0,  38, 35, 25, 20, 30, 50, 15, 44, 80],  // v5  one OOS
    [57, 37, 32, 24, 19, 29, 47, 13, 43, 78],  // v6
    [60, 40, 35, 0,  20, 30, 50, 15, 45, 80],  // v7  one OOS
    [30, 15, 10, 5,  8,  10, 20, 5,  15, 40],  // v8  mostly low
    [59, 39, 34, 24, 20, 29, 49, 14, 44, 79],  // v9
    [56, 36, 31, 23, 17, 27, 46, 12, 41, 76],  // v10
    [60, 40, 35, 25, 20, 30, 0,  15, 45, 80],  // v11 one OOS
    [58, 38, 33, 24, 19, 28, 48, 14, 43, 78],  // v12
    [55, 35, 30, 20, 15, 25, 45, 10, 38, 72],  // v13
    [57, 37, 33, 22, 18, 28, 47, 12, 42, 77],  // v14
    [59, 39, 34, 25, 19, 29, 49, 14, 44, 79],  // v15
    [60, 40, 35, 25, 20, 30, 50, 15, 45, 80],  // v16
    [50, 28, 20, 10, 10, 15, 35, 8,  25, 60],  // v17 some low
    [58, 38, 34, 24, 19, 29, 48, 14, 43, 78],  // v18
    [56, 36, 32, 23, 18, 27, 46, 13, 41, 76],  // v19
    // v20 is open — no audit items
  ];

  await prisma.auditItem.createMany({
    data: visits
      .filter((_, i) => visitData[i].status === VisitStatus.completed)
      .flatMap((v, i) => makeAuditItems(v.id, qtyProfiles[i] ?? qtyProfiles[0])),
  });
  console.log('  ✔  audit_items');

  // ── 10. Schedules — current month + next 2 weeks ────────────────────────────
  //
  // supNorth schedules for merchNorth; supSouth schedules for merchSouth.
  // Mix of: past (completed/cancelled) + upcoming (pending).
  //
  const scheduleData: {
    user_id: string; store_id: string; created_by_id: string;
    scheduled_at: Date; notes?: string; status: ScheduleStatus;
  }[] = [
    // ── Past (completed) ──────────────────────────────────────
    { user_id: merchNorth.id, store_id: storeN1.id, created_by_id: supNorth.id,
      scheduled_at: dt(-14, 8), notes: 'Weekly shelf check — aisle 3',
      status: ScheduleStatus.completed },
    { user_id: merchNorth.id, store_id: storeN2.id, created_by_id: supNorth.id,
      scheduled_at: dt(-12, 9), notes: 'Restock dairy section',
      status: ScheduleStatus.completed },
    { user_id: merchNorth.id, store_id: storeN3.id, created_by_id: supNorth.id,
      scheduled_at: dt(-10, 8, 30),
      status: ScheduleStatus.completed },
    { user_id: merchSouth.id, store_id: storeS1.id, created_by_id: supSouth.id,
      scheduled_at: dt(-14, 9), notes: 'Full store audit',
      status: ScheduleStatus.completed },
    { user_id: merchSouth.id, store_id: storeS2.id, created_by_id: supSouth.id,
      scheduled_at: dt(-11, 8),
      status: ScheduleStatus.completed },
    { user_id: supNorth.id, store_id: storeN1.id, created_by_id: supNorth.id,
      scheduled_at: dt(-7, 10), notes: 'Supervisor spot check',
      status: ScheduleStatus.completed },
    { user_id: supSouth.id, store_id: storeS3.id, created_by_id: supSouth.id,
      scheduled_at: dt(-8, 11), notes: 'New product placement review',
      status: ScheduleStatus.completed },

    // ── Past (cancelled) ─────────────────────────────────────
    { user_id: merchNorth.id, store_id: storeN2.id, created_by_id: supNorth.id,
      scheduled_at: dt(-9, 9), notes: 'Cancelled — public holiday',
      status: ScheduleStatus.cancelled },
    { user_id: merchSouth.id, store_id: storeS3.id, created_by_id: supSouth.id,
      scheduled_at: dt(-6, 8), notes: 'Cancelled — store closed',
      status: ScheduleStatus.cancelled },

    // ── This week (pending) ───────────────────────────────────
    { user_id: merchNorth.id, store_id: storeN1.id, created_by_id: supNorth.id,
      scheduled_at: dt(0, 8, 30), notes: 'Routine check + photo documentation',
      status: ScheduleStatus.pending },
    { user_id: merchNorth.id, store_id: storeN3.id, created_by_id: supNorth.id,
      scheduled_at: dt(1, 9), notes: 'Focus on beverage aisle',
      status: ScheduleStatus.pending },
    { user_id: merchSouth.id, store_id: storeS2.id, created_by_id: supSouth.id,
      scheduled_at: dt(1, 8),
      status: ScheduleStatus.pending },
    { user_id: supSouth.id, store_id: storeS1.id, created_by_id: supSouth.id,
      scheduled_at: dt(2, 10), notes: 'Supervisor compliance check',
      status: ScheduleStatus.pending },

    // ── Next week (pending) ───────────────────────────────────
    { user_id: merchNorth.id, store_id: storeN2.id, created_by_id: supNorth.id,
      scheduled_at: dt(7, 8, 30), notes: 'Monthly full audit',
      status: ScheduleStatus.pending },
    { user_id: merchNorth.id, store_id: storeN1.id, created_by_id: supNorth.id,
      scheduled_at: dt(8, 9),
      status: ScheduleStatus.pending },
    { user_id: merchNorth.id, store_id: storeN3.id, created_by_id: supNorth.id,
      scheduled_at: dt(9, 8),
      status: ScheduleStatus.pending },
    { user_id: merchSouth.id, store_id: storeS1.id, created_by_id: supSouth.id,
      scheduled_at: dt(7, 9), notes: 'Focus on dairy and bakery',
      status: ScheduleStatus.pending },
    { user_id: merchSouth.id, store_id: storeS3.id, created_by_id: supSouth.id,
      scheduled_at: dt(8, 8, 30),
      status: ScheduleStatus.pending },
    { user_id: supNorth.id, store_id: storeN2.id, created_by_id: supNorth.id,
      scheduled_at: dt(10, 10), notes: 'Quarterly supervisor review',
      status: ScheduleStatus.pending },

    // ── 2 weeks from now (pending) ────────────────────────────
    { user_id: merchNorth.id, store_id: storeN1.id, created_by_id: supNorth.id,
      scheduled_at: dt(14, 8),
      status: ScheduleStatus.pending },
    { user_id: merchSouth.id, store_id: storeS2.id, created_by_id: supSouth.id,
      scheduled_at: dt(14, 9), notes: 'Pre-promo stock verification',
      status: ScheduleStatus.pending },
    { user_id: merchSouth.id, store_id: storeS1.id, created_by_id: supSouth.id,
      scheduled_at: dt(15, 8),
      status: ScheduleStatus.pending },
  ];

  await prisma.schedule.createMany({ data: scheduleData });
  console.log('  ✔  schedules');

  // ── Summary ──────────────────────────────────────────────────────────────────
  const counts = {
    regions:  await prisma.region.count(),
    stores:   await prisma.store.count(),
    products: await prisma.product.count(),
    users:    await prisma.user.count(),
    visits:   await prisma.visit.count(),
    audits:   await prisma.auditItem.count(),
    schedules:await prisma.schedule.count(),
  };

  console.log('\n✅  Seed complete!\n');
  console.log(`  Regions: ${counts.regions}  Stores: ${counts.stores}  Products: ${counts.products}`);
  console.log(`  Users: ${counts.users}  Visits: ${counts.visits}  Audit items: ${counts.audits}  Schedules: ${counts.schedules}`);
  console.log('\n  Credentials (all passwords: password123)');
  console.log('  ┌────────────────────────────────────┬─────────────────┐');
  console.log('  │ Email                               │ Role            │');
  console.log('  ├────────────────────────────────────┼─────────────────┤');
  console.log(`  │ ${superAdmin.email.padEnd(36)} │ super_admin     │`);
  console.log(`  │ ${adminNorth.email.padEnd(36)} │ admin (north)   │`);
  console.log(`  │ ${adminSouth.email.padEnd(36)} │ admin (south)   │`);
  console.log(`  │ ${supNorth.email.padEnd(36)} │ supervisor N    │`);
  console.log(`  │ ${supSouth.email.padEnd(36)} │ supervisor S    │`);
  console.log(`  │ ${merchNorth.email.padEnd(36)} │ merchandiser N  │`);
  console.log(`  │ ${merchSouth.email.padEnd(36)} │ merchandiser S  │`);
  console.log('  └────────────────────────────────────┴─────────────────┘');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
