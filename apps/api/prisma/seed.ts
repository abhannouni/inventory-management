import { AuditItemStatus, PrismaClient, ScheduleStatus, VisitStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { syncRbac } from './rbac';

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
  await prisma.dashboardWidget.deleteMany();
  await prisma.dashboard.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.kpi.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.auditItem.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.productStore.deleteMany();
  await prisma.userStore.deleteMany();
  await prisma.product.deleteMany();
  await prisma.client.deleteMany();
  await prisma.store.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.region.deleteMany();

  // ── 2. Regions ──────────────────────────────────────────────────────────────
  const [north, south] = await Promise.all([
    prisma.region.create({ data: { name: 'North Region' } }),
    prisma.region.create({ data: { name: 'South Region' } }),
  ]);
  console.log('  ✔  regions');

  // ── 3. Users (same as before) ────────────────────────────────────────────────
  const [superAdmin, adminNorth, adminSouth, genMgmt, supNorth, supSouth, merchNorth, merchSouth] =
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
          full_name: 'General Management',
          email: 'gm@example.com',
          password: await HASH('password123'),
          role: 'general_management',
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
        brand: 'Marjane',
        channel: 'gms',
        classification: 'A',
        city: 'Casablanca',
        postal_code: '20250',
        opening_date: new Date('2015-03-18'),
        section_manager_name: 'Youssef Alami',
        section_manager_phone: '+212 661 234 567',
        department_manager_name: 'Salma Bennis',
        department_manager_phone: '+212 662 345 678',
        gds_name: 'Karim Idrissi',
        gds_phone: '+212 663 456 789',
        address: '12 Boulevard Mohammed V',
        latitude: 33.573100,
        longitude: -7.589800,
        region_id: north.id,
        visible_to_gm: true,
      },
    }),
    prisma.store.create({
      data: {
        name: 'Carrefour North',
        brand: 'Carrefour',
        channel: 'gms',
        classification: 'B',
        city: 'Casablanca',
        postal_code: '20260',
        opening_date: new Date('2017-09-05'),
        section_manager_name: 'Nadia Chraibi',
        section_manager_phone: '+212 661 111 222',
        department_manager_name: 'Omar Fassi',
        department_manager_phone: '+212 662 222 333',
        gds_name: 'Hicham Berrada',
        gds_phone: '+212 663 333 444',
        address: '45 Boulevard Zerktouni',
        latitude: 33.592100,
        longitude: -7.632300,
        region_id: north.id,
        visible_to_gm: true,
      },
    }),
    prisma.store.create({
      data: {
        name: 'Label Vie North',
        brand: 'Label Vie',
        channel: 'ls',
        classification: 'C',
        city: 'Casablanca',
        postal_code: '20270',
        opening_date: new Date('2019-06-22'),
        section_manager_name: 'Imane Tazi',
        section_manager_phone: '+212 661 444 555',
        department_manager_name: 'Rachid Alaoui',
        department_manager_phone: '+212 662 555 666',
        gds_name: 'Sanaa Kabbaj',
        gds_phone: '+212 663 666 777',
        address: '78 Rue Ibnou Sina, Maarif',
        latitude: 33.585000,
        longitude: -7.639000,
        region_id: north.id,
      },
    }),
    prisma.store.create({
      data: {
        name: 'Marjane South',
        brand: 'Marjane',
        channel: 'gms',
        classification: 'A',
        city: 'Marrakech',
        postal_code: '40120',
        opening_date: new Date('2014-11-30'),
        section_manager_name: 'Mehdi Sabri',
        section_manager_phone: '+212 661 777 888',
        department_manager_name: 'Laila Bennani',
        department_manager_phone: '+212 662 888 999',
        gds_name: 'Anas Chakir',
        gds_phone: '+212 663 999 000',
        address: 'Avenue Mohammed VI, Guéliz',
        latitude: 31.629500,
        longitude: -8.008900,
        region_id: south.id,
        visible_to_gm: true,
      },
    }),
    prisma.store.create({
      data: {
        name: 'Carrefour South',
        brand: 'Carrefour',
        channel: 'gms',
        classification: 'B',
        city: 'Marrakech',
        postal_code: '40130',
        opening_date: new Date('2018-02-14'),
        section_manager_name: 'Zineb Ouali',
        section_manager_phone: '+212 661 121 314',
        department_manager_name: 'Tarik Hamdi',
        department_manager_phone: '+212 662 131 415',
        gds_name: 'Nabil Regragui',
        gds_phone: '+212 663 141 516',
        address: 'Route de Targa, Guéliz',
        latitude: 31.641700,
        longitude: -8.008800,
        region_id: south.id,
      },
    }),
    prisma.store.create({
      data: {
        name: 'BIM South',
        brand: 'BIM',
        channel: 'ls',
        classification: 'D',
        city: 'Marrakech',
        postal_code: '40140',
        opening_date: new Date('2021-07-01'),
        section_manager_name: 'Fatima Zahra Naji',
        section_manager_phone: '+212 661 151 617',
        department_manager_name: 'Adil Mansouri',
        department_manager_phone: '+212 662 161 718',
        gds_name: 'Soukaina Rami',
        gds_phone: '+212 663 171 819',
        address: 'Avenue Hassan II',
        latitude: 31.610800,
        longitude: -7.983800,
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
    { name: 'Milk 1L',            sku: 'MLK-001', category: 'Dairy',     distributeur: 'Danone',       famille: 'Produits laitiers', sous_famille: 'Lait',       format: '1L' },
    { name: 'White Bread',        sku: 'BRD-001', category: 'Bakery',    distributeur: 'Panera',       famille: 'Boulangerie',       sous_famille: 'Pain',       format: '500g' },
    { name: 'Orange Juice 1L',    sku: 'OJ-001',  category: 'Beverages', distributeur: 'Tropicana',     famille: 'Boissons',          sous_famille: 'Jus',        format: '1L' },
    { name: 'Yogurt 500g',        sku: 'YGT-001', category: 'Dairy',     distributeur: 'Danone',       famille: 'Produits laitiers', sous_famille: 'Yaourt',     format: '500g' },
    { name: 'Cheddar Cheese',     sku: 'CHS-001', category: 'Dairy',     distributeur: 'Lactalis',     famille: 'Produits laitiers', sous_famille: 'Fromage',    format: '200g' },
    { name: 'Butter 250g',        sku: 'BTR-001', category: 'Dairy',     distributeur: 'Lactalis',     famille: 'Produits laitiers', sous_famille: 'Beurre',     format: '250g' },
    { name: 'Eggs 12pk',          sku: 'EGG-001', category: 'Dairy',     distributeur: 'Local Farms',  famille: 'Produits laitiers', sous_famille: 'Oeufs',      format: '12pk' },
    { name: 'Coffee 500g',        sku: 'CFE-001', category: 'Beverages', distributeur: 'Nestle',       famille: 'Boissons',          sous_famille: 'Cafe',       format: '500g' },
    { name: 'Sugar 1kg',          sku: 'SGR-001', category: 'Grocery',   distributeur: 'Cristal',      famille: 'Epicerie',          sous_famille: 'Sucre',      format: '1kg' },
    { name: 'Mineral Water 1.5L', sku: 'WAT-001', category: 'Beverages', distributeur: 'Nestle',       famille: 'Boissons',          sous_famille: 'Eau',        format: '1.5L' },
  ];

  // Clients are the brands/suppliers behind the catalogue — derived from `distributeur`.
  const clientDefs = [
    { name: 'Danone',      code: 'DAN', contact_name: 'Sofia Bennani',  contact_email: 'contact@danone.example',      contact_phone: '+212 522 000 001', address: 'Casablanca, Morocco' },
    { name: 'Panera',      code: 'PAN', contact_name: 'Marc Duval',     contact_email: 'contact@panera.example',      contact_phone: '+212 522 000 002', address: 'Rabat, Morocco' },
    { name: 'Tropicana',   code: 'TRO', contact_name: 'Leila Amrani',   contact_email: 'contact@tropicana.example',   contact_phone: '+212 522 000 003', address: 'Casablanca, Morocco' },
    { name: 'Lactalis',    code: 'LAC', contact_name: 'Yassine Idrissi',contact_email: 'contact@lactalis.example',    contact_phone: '+212 522 000 004', address: 'Tangier, Morocco' },
    { name: 'Local Farms', code: 'LOC', contact_name: 'Fatima Zahra',   contact_email: 'contact@localfarms.example',  contact_phone: '+212 522 000 005', address: 'Meknes, Morocco' },
    { name: 'Nestle',      code: 'NES', contact_name: 'Omar Tazi',      contact_email: 'contact@nestle.example',      contact_phone: '+212 522 000 006', address: 'Casablanca, Morocco' },
    { name: 'Cristal',     code: 'CRI', contact_name: 'Nadia Alaoui',   contact_email: 'contact@cristal.example',     contact_phone: '+212 522 000 007', address: 'Fes, Morocco', is_active: false },
  ];

  const clients = await Promise.all(
    clientDefs.map((c) => prisma.client.create({ data: c })),
  );
  const clientIdByName = new Map(clients.map((c) => [c.name, c.id]));
  console.log('  ✔  clients');

  const products = await Promise.all(
    productDefs.map((p) =>
      prisma.product.create({
        data: { ...p, client_id: clientIdByName.get(p.distributeur) ?? null },
      }),
    ),
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
      checkin_lat: 33.573110, checkin_lng: -7.589810,
      checkout_lat: 33.573110, checkout_lng: -7.589810 },
    { user_id: merchNorth.id, store_id: storeN2.id, status: VisitStatus.completed,
      checkin_time: dt(-27, 9), checkout_time: dt(-27, 11),
      checkin_lat: 33.592110, checkin_lng: -7.632310,
      checkout_lat: 33.592110, checkout_lng: -7.632310 },
    { user_id: merchSouth.id, store_id: storeS1.id, status: VisitStatus.completed,
      checkin_time: dt(-28, 8, 30), checkout_time: dt(-28, 11),
      checkin_lat: 31.629510, checkin_lng: -8.008910,
      checkout_lat: 31.629510, checkout_lng: -8.008910 },
    { user_id: merchSouth.id, store_id: storeS2.id, status: VisitStatus.completed,
      checkin_time: dt(-26, 9), checkout_time: dt(-26, 12),
      checkin_lat: 31.641710, checkin_lng: -8.008810,
      checkout_lat: 31.641710, checkout_lng: -8.008810 },

    // ── 3 weeks ago ──────────────────────────────────────────
    { user_id: supNorth.id, store_id: storeN3.id, status: VisitStatus.completed,
      checkin_time: dt(-21, 10), checkout_time: dt(-21, 12, 30),
      checkin_lat: 33.585010, checkin_lng: -7.639010,
      checkout_lat: 33.585010, checkout_lng: -7.639010 },
    { user_id: merchNorth.id, store_id: storeN3.id, status: VisitStatus.completed,
      checkin_time: dt(-20, 8), checkout_time: dt(-20, 10),
      checkin_lat: 33.585010, checkin_lng: -7.639010,
      checkout_lat: 33.585010, checkout_lng: -7.639010 },
    { user_id: merchNorth.id, store_id: storeN1.id, status: VisitStatus.completed,
      checkin_time: dt(-19, 9), checkout_time: dt(-19, 11, 30),
      checkin_lat: 33.573110, checkin_lng: -7.589810,
      checkout_lat: 33.573110, checkout_lng: -7.589810 },
    { user_id: merchSouth.id, store_id: storeS3.id, status: VisitStatus.completed,
      checkin_time: dt(-21, 8), checkout_time: dt(-21, 10, 30),
      checkin_lat: 31.610810, checkin_lng: -7.983810,
      checkout_lat: 31.610810, checkout_lng: -7.983810 },
    { user_id: supSouth.id, store_id: storeS1.id, status: VisitStatus.completed,
      checkin_time: dt(-20, 11), checkout_time: dt(-20, 13),
      checkin_lat: 31.629510, checkin_lng: -8.008910,
      checkout_lat: 31.629510, checkout_lng: -8.008910 },

    // ── 2 weeks ago ──────────────────────────────────────────
    { user_id: merchNorth.id, store_id: storeN2.id, status: VisitStatus.completed,
      checkin_time: dt(-14, 9), checkout_time: dt(-14, 11),
      checkin_lat: 33.592110, checkin_lng: -7.632310,
      checkout_lat: 33.592110, checkout_lng: -7.632310 },
    { user_id: merchNorth.id, store_id: storeN3.id, status: VisitStatus.completed,
      checkin_time: dt(-13, 8, 30), checkout_time: dt(-13, 10, 30),
      checkin_lat: 33.585010, checkin_lng: -7.639010,
      checkout_lat: 33.585010, checkout_lng: -7.639010 },
    { user_id: merchSouth.id, store_id: storeS1.id, status: VisitStatus.completed,
      checkin_time: dt(-15, 9), checkout_time: dt(-15, 12),
      checkin_lat: 31.629510, checkin_lng: -8.008910,
      checkout_lat: 31.629510, checkout_lng: -8.008910 },
    { user_id: merchSouth.id, store_id: storeS2.id, status: VisitStatus.completed,
      checkin_time: dt(-13, 8), checkout_time: dt(-13, 10),
      checkin_lat: 31.641710, checkin_lng: -8.008810,
      checkout_lat: 31.641710, checkout_lng: -8.008810 },
    { user_id: supNorth.id, store_id: storeN1.id, status: VisitStatus.completed,
      checkin_time: dt(-12, 10), checkout_time: dt(-12, 12),
      checkin_lat: 33.573110, checkin_lng: -7.589810,
      checkout_lat: 33.573110, checkout_lng: -7.589810 },

    // ── Last week ─────────────────────────────────────────────
    { user_id: merchNorth.id, store_id: storeN1.id, status: VisitStatus.completed,
      checkin_time: dt(-7, 8), checkout_time: dt(-7, 10, 30),
      checkin_lat: 33.573110, checkin_lng: -7.589810,
      checkout_lat: 33.573110, checkout_lng: -7.589810 },
    { user_id: merchNorth.id, store_id: storeN2.id, status: VisitStatus.completed,
      checkin_time: dt(-6, 9), checkout_time: dt(-6, 11),
      checkin_lat: 33.592110, checkin_lng: -7.632310,
      checkout_lat: 33.592110, checkout_lng: -7.632310 },
    { user_id: supSouth.id, store_id: storeS2.id, status: VisitStatus.completed,
      checkin_time: dt(-7, 9, 30), checkout_time: dt(-7, 11, 30),
      checkin_lat: 31.641710, checkin_lng: -8.008810,
      checkout_lat: 31.641710, checkout_lng: -8.008810 },
    { user_id: merchSouth.id, store_id: storeS3.id, status: VisitStatus.completed,
      checkin_time: dt(-5, 8), checkout_time: dt(-5, 10, 30),
      checkin_lat: 31.610810, checkin_lng: -7.983810,
      checkout_lat: 31.610810, checkout_lng: -7.983810 },

    // ── This week ─────────────────────────────────────────────
    { user_id: merchNorth.id, store_id: storeN3.id, status: VisitStatus.completed,
      checkin_time: dt(-2, 9), checkout_time: dt(-2, 11, 30),
      checkin_lat: 33.585010, checkin_lng: -7.639010,
      checkout_lat: 33.585010, checkout_lng: -7.639010 },
    { user_id: merchSouth.id, store_id: storeS1.id, status: VisitStatus.completed,
      checkin_time: dt(-1, 8, 30), checkout_time: dt(-1, 10, 30),
      checkin_lat: 31.629510, checkin_lng: -8.008910,
      checkout_lat: 31.629510, checkout_lng: -8.008910 },

    // ── Currently open (no checkout) ──────────────────────────
    { user_id: merchSouth.id, store_id: storeS2.id, status: VisitStatus.open,
      checkin_time: dt(0, 9), checkin_lat: 31.641710, checkin_lng: -8.008810 },
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

  // ── 11. Plans ───────────────────────────────────────────────────────────────
  const [starter, pro, enterprise] = await Promise.all([
    prisma.plan.create({
      data: {
        name: 'Starter', code: 'STARTER', price: 499, currency: 'MAD',
        billing_period: 'monthly', max_users: 5, max_pos: 10, max_products: 50,
        description: 'For small brands starting field audits.', sort_order: 1,
      },
    }),
    prisma.plan.create({
      data: {
        name: 'Professional', code: 'PRO', price: 1499, currency: 'MAD',
        billing_period: 'monthly', max_users: 25, max_pos: 100, max_products: 500,
        description: 'For growing brands with a national footprint.', sort_order: 2,
      },
    }),
    prisma.plan.create({
      data: {
        name: 'Enterprise', code: 'ENTERPRISE', price: 4999, currency: 'MAD',
        billing_period: 'yearly', max_users: null, max_pos: null, max_products: null,
        description: 'Unlimited usage with priority support.', sort_order: 3,
      },
    }),
  ]);
  console.log('  ✔  plans');

  // ── 12. Subscriptions — one per client, covering every status ───────────────
  const byName = (n: string) => clientIdByName.get(n)!;

  await prisma.subscription.createMany({
    data: [
      { client_id: byName('Danone'),      plan_id: enterprise.id, status: 'active',    starts_at: dt(-200), ends_at: dt(165) },
      { client_id: byName('Nestle'),      plan_id: enterprise.id, status: 'active',    starts_at: dt(-150), ends_at: dt(215) },
      { client_id: byName('Lactalis'),    plan_id: pro.id,        status: 'active',    starts_at: dt(-60),  ends_at: dt(305) },
      { client_id: byName('Tropicana'),   plan_id: pro.id,        status: 'past_due',  starts_at: dt(-90),  ends_at: dt(-2), notes: 'Invoice overdue since last cycle.' },
      { client_id: byName('Panera'),      plan_id: starter.id,    status: 'trialing',  starts_at: dt(-10),  ends_at: dt(20) },
      { client_id: byName('Local Farms'), plan_id: starter.id,    status: 'expired',   starts_at: dt(-400), ends_at: dt(-35) },
      { client_id: byName('Cristal'),     plan_id: pro.id,        status: 'cancelled', starts_at: dt(-180), ends_at: dt(-20), cancelled_at: dt(-25), notes: 'Cancelled at renewal.' },
    ],
  });
  console.log('  ✔  subscriptions');

  // ── 13. KPIs ────────────────────────────────────────────────────────────────
  await prisma.kpi.createMany({
    data: [
      { code: 'visit_completion_rate', name: 'Visit completion rate',   unit: '%',      target: 95, warn_below: 80, direction: 'higher_is_better', sort_order: 1, description: 'Share of scheduled visits that were completed.' },
      { code: 'stock_availability',    name: 'Stock availability',      unit: '%',      target: 90, warn_below: 75, direction: 'higher_is_better', sort_order: 2, description: 'Share of audited products found in stock.' },
      { code: 'out_of_stock_rate',     name: 'Out-of-stock rate',       unit: '%',      target: 5,  warn_below: null, direction: 'lower_is_better', sort_order: 3, description: 'Share of audited products found out of stock.' },
      { code: 'avg_visit_duration',    name: 'Average visit duration',  unit: 'min',    target: 90, warn_below: null, direction: 'lower_is_better', sort_order: 4, description: 'Mean time between check-in and check-out.' },
      { code: 'shelf_variance',        name: 'Shelf variance',          unit: 'units',  target: 0,  warn_below: null, direction: 'lower_is_better', sort_order: 5, description: 'Mean gap between expected and found quantities.' },
      { code: 'active_pos',            name: 'Active points of sale',   unit: 'POS',    target: null, warn_below: null, direction: 'higher_is_better', sort_order: 6, description: 'Points of sale visited at least once this month.' },
    ],
  });
  console.log('  ✔  kpis');

  // ── 14. RBAC — roles, permissions, grants, and user role_id backfill ────────
  const rbac = await syncRbac(prisma);
  console.log(`  ✔  rbac (${rbac.permissions} permissions, ${rbac.roles} roles)`);

  // ── 15. Default dashboards, one per role ────────────────────────────────────
  const kpis = await prisma.kpi.findMany({ orderBy: { sort_order: 'asc' } });
  const roles = await prisma.role.findMany();

  for (const role of roles) {
    const dashboard = await prisma.dashboard.create({
      data: {
        name: `${role.label} overview`,
        description: `Default dashboard for ${role.label}.`,
        role_id: role.id,
        is_default: true,
      },
    });

    // Merchandisers get a leaner board than everyone else.
    const shown = role.name === 'merchandiser' ? kpis.slice(0, 3) : kpis.slice(0, 4);

    await prisma.dashboardWidget.createMany({
      data: shown.map((kpi, i) => ({
        dashboard_id: dashboard.id,
        kpi_id: kpi.id,
        type: 'kpi_card' as const,
        title: kpi.name,
        position: i,
      })),
    });
  }
  console.log('  ✔  dashboards');

  // ── Summary ──────────────────────────────────────────────────────────────────
  const counts = {
    regions:       await prisma.region.count(),
    stores:        await prisma.store.count(),
    products:      await prisma.product.count(),
    users:         await prisma.user.count(),
    visits:        await prisma.visit.count(),
    audits:        await prisma.auditItem.count(),
    schedules:     await prisma.schedule.count(),
    clients:       await prisma.client.count(),
    plans:         await prisma.plan.count(),
    subscriptions: await prisma.subscription.count(),
    kpis:          await prisma.kpi.count(),
    dashboards:    await prisma.dashboard.count(),
    permissions:   await prisma.permission.count(),
    visibleToGm:   await prisma.store.count({ where: { visible_to_gm: true } }),
  };

  console.log('\n✅  Seed complete!\n');
  console.log(`  Regions: ${counts.regions}  Stores: ${counts.stores} (${counts.visibleToGm} visible to GM)  Products: ${counts.products}`);
  console.log(`  Users: ${counts.users}  Visits: ${counts.visits}  Audit items: ${counts.audits}  Schedules: ${counts.schedules}`);
  console.log(`  Clients: ${counts.clients}  Plans: ${counts.plans}  Subscriptions: ${counts.subscriptions}`);
  console.log(`  KPIs: ${counts.kpis}  Dashboards: ${counts.dashboards}  Permissions: ${counts.permissions}`);
  console.log('\n  Credentials (all passwords: password123)');
  console.log('  ┌──────────────────────────────────────┬────────────────────┐');
  console.log('  │ Email                                │ Role               │');
  console.log('  ├──────────────────────────────────────┼────────────────────┤');
  console.log(`  │ ${superAdmin.email.padEnd(36)} │ super_admin        │`);
  console.log(`  │ ${adminNorth.email.padEnd(36)} │ admin (north)      │`);
  console.log(`  │ ${adminSouth.email.padEnd(36)} │ admin (south)      │`);
  console.log(`  │ ${genMgmt.email.padEnd(36)} │ general_management │`);
  console.log(`  │ ${supNorth.email.padEnd(36)} │ supervisor N       │`);
  console.log(`  │ ${supSouth.email.padEnd(36)} │ supervisor S       │`);
  console.log(`  │ ${merchNorth.email.padEnd(36)} │ merchandiser N     │`);
  console.log(`  │ ${merchSouth.email.padEnd(36)} │ merchandiser S     │`);
  console.log('  └──────────────────────────────────────┴────────────────────┘');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
