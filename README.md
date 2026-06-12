# Inventory Management API

A NestJS + Prisma REST API for managing field merchandiser operations — store visits with GPS check-in/out, product audits, photo uploads, and role-scoped reports.

## Stack

- **Runtime**: Node.js 18+
- **Framework**: NestJS 11 (TypeScript)
- **ORM**: Prisma 7 with `@prisma/adapter-pg`
- **Database**: PostgreSQL
- **Auth**: JWT (Passport)
- **File Upload**: Cloudinary
- **Monorepo**: pnpm workspaces
- **Docs**: Swagger UI at `/docs`

---

## Project Structure

```
inventory-management/
├── apps/
│   ├── api/                  # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── seed.ts
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── auth/         # JWT auth, guards, decorators
│   │   │   ├── user/         # User CRUD + store assignment
│   │   │   ├── regions/      # Region CRUD
│   │   │   ├── stores/       # Store CRUD
│   │   │   ├── products/     # Product catalog
│   │   │   ├── product-store/# Per-store expected quantities
│   │   │   ├── visits/       # GPS check-in / check-out
│   │   │   ├── audit-items/  # POS-style product audits
│   │   │   ├── upload/       # Cloudinary image upload
│   │   │   ├── reports/      # Role-scoped reports
│   │   │   └── common/       # Filters, interceptors, utils
│   │   ├── prisma.config.ts
│   │   └── .env
│   └── web/                  # React/Vite frontend (separate)
└── package.json
```

---

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- PostgreSQL running locally (or remote)
- Cloudinary account (for photo uploads)

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

Edit `apps/api/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/inventory_management"

# JWT
JWT_ACCESS_SECRET="your-secret-minimum-32-chars"
JWT_ACCESS_EXPIRES="15m"

# App
PORT=3001

# Cloudinary
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 3. Run database migration

```bash
pnpm db:migrate
```

### 4. Seed test data

```bash
pnpm db:seed
```

### 5. Start the API

```bash
pnpm dev:api
```

API runs at `http://localhost:3001`
Swagger docs at `http://localhost:3001/docs`

---

## Database Scripts

All commands can be run from the **monorepo root**:

| Command | Description |
|---|---|
| `pnpm db:migrate` | Create and apply a new migration (dev) |
| `pnpm db:migrate:prod` | Apply pending migrations (production) |
| `pnpm db:push` | Push schema changes without a migration file |
| `pnpm db:reset` | Wipe database and replay all migrations |
| `pnpm db:seed` | Seed the database with test data |
| `pnpm db:studio` | Open Prisma Studio (visual DB browser) |
| `pnpm db:generate` | Regenerate the Prisma client |

---

## Roles

| Role | Access |
|---|---|
| `super_admin` | Full access to everything |
| `admin` | Scoped to their own region |
| `supervisor` | Scoped to assigned stores |
| `merchandiser` | Scoped to own visits only |

---

## Seed Accounts

After running `pnpm db:seed`, these accounts are available (password: **password123**):

| Email | Role |
|---|---|
| superadmin@example.com | super_admin |
| admin.north@example.com | admin |
| admin.south@example.com | admin |
| supervisor.north@example.com | supervisor |
| supervisor.south@example.com | supervisor |
| merch.north@example.com | merchandiser |
| merch.south@example.com | merchandiser |

---

## API Endpoints

All endpoints (except `POST /auth/login` and `POST /auth/register`) require:

```
Authorization: Bearer <token>
```

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login and receive JWT |
| GET | `/auth/me` | Get current user profile |

**Login example:**

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@example.com","password":"password123"}'
```

**Response:**
```json
{
  "success": true,
  "data": { "access_token": "eyJ..." },
  "message": "ok"
}
```

---

### Users

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/users` | super_admin, admin | List all users |
| GET | `/users/:id` | super_admin, admin | Get user by ID |
| POST | `/users` | super_admin, admin | Create user |
| PATCH | `/users/:id` | super_admin, admin | Update user |
| DELETE | `/users/:id` | super_admin, admin | Delete user |
| POST | `/users/:id/stores` | super_admin, admin | Assign stores to user |

---

### Regions

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/regions` | all | List regions |
| GET | `/regions/:id` | all | Get region |
| POST | `/regions` | super_admin | Create region |
| PATCH | `/regions/:id` | super_admin | Update region |
| DELETE | `/regions/:id` | super_admin | Delete region |

---

### Stores

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/stores` | all | List stores (scoped by role) |
| GET | `/stores/:id` | all | Get store |
| POST | `/stores` | super_admin, admin | Create store |
| PATCH | `/stores/:id` | super_admin, admin | Update store |
| DELETE | `/stores/:id` | super_admin, admin | Delete store |

---

### Products

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/products` | all | List products |
| GET | `/products/:id` | all | Get product |
| POST | `/products` | super_admin, admin | Create product |
| PATCH | `/products/:id` | super_admin, admin | Update product |
| DELETE | `/products/:id` | super_admin, admin | Delete product |

---

### Product Stores (per-store quantities)

| Method | Path | Description |
|---|---|---|
| GET | `/product-stores` | List assignments (filter by `?store_id=` or `?product_id=`) |
| GET | `/product-stores/:id` | Get assignment |
| POST | `/product-stores` | Assign product to store with `expected_qty` |
| PATCH | `/product-stores/:id` | Update expected quantity |
| DELETE | `/product-stores/:id` | Remove assignment |

---

### Visits

| Method | Path | Description |
|---|---|---|
| POST | `/visits/checkin` | Check in to a store (GPS validated, 200m radius) |
| POST | `/visits/checkout` | Check out of current visit |
| GET | `/visits` | List visits (scoped by role) |
| GET | `/visits/:id` | Get visit with audit items |

**Check-in body:**
```json
{
  "store_id": "uuid",
  "lat": 34.052200,
  "lng": -118.243700
}
```

**Rules:**
- User must be within **200 metres** of the store
- Only one open visit allowed at a time (409 if duplicate)
- `supervisor` and `merchandiser` must be assigned to the store

---

### Audit Items

| Method | Path | Description |
|---|---|---|
| POST | `/audit-items` | Create a single audit item |
| POST | `/audit-items/bulk` | Bulk upsert audit items for a visit |
| GET | `/audit-items` | List items (filter by `?visit_id=`) |
| GET | `/audit-items/:id` | Get audit item |
| PATCH | `/audit-items/:id` | Update audit item |
| DELETE | `/audit-items/:id` | Delete audit item |

**Single audit body:**
```json
{
  "visit_id": "uuid",
  "product_id": "uuid",
  "qty_found": 45,
  "notes": "Shelf was partially empty",
  "photo_url": "https://res.cloudinary.com/..."
}
```

**Status is auto-derived:**
- `qty_found == 0` → `out_of_stock`
- `qty_found < expected_qty * 0.5` → `low_stock`
- otherwise → `in_stock`

---

### Upload

| Method | Path | Description |
|---|---|---|
| POST | `/upload` | Upload an image to Cloudinary |

- Form field: `file`
- Max size: 5 MB
- Accepted types: `jpeg`, `jpg`, `png`, `webp`
- Returns: `{ url: "https://res.cloudinary.com/..." }`

```bash
curl -X POST http://localhost:3001/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@photo.jpg"
```

---

### Reports

| Method | Path | Description |
|---|---|---|
| GET | `/reports/visits` | All visits with per-visit audit summary |
| GET | `/reports/stores/:id` | Full audit history for a store, grouped by visit |
| GET | `/reports/products/:id` | Cross-visit history for a product |

All reports are scoped by role (super_admin sees all, admin sees their region, etc.)

**Optional query filters:** `?from=2026-01-01&to=2026-12-31&store_id=uuid`

**Visit summary fields:**
```json
{
  "summary": {
    "total": 5,
    "inStock": 4,
    "lowStock": 0,
    "outOfStock": 1,
    "completionPct": 80
  }
}
```

---

## Response Format

Every response is wrapped in a standard envelope:

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "message": "ok"
}
```

**Error:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "path": "/visits/checkin",
  "timestamp": "2026-06-12T11:00:00.000Z"
}
```

---

## Data Model

```
Region
  └── Users (admin scoped to region)
  └── Stores

Store
  └── UserStore (supervisor/merchandiser assignments)
  └── ProductStore (product + expected_qty per store)
  └── Visits

Visit
  └── AuditItems (one per product per visit)

Product
  └── ProductStore
  └── AuditItems
```

---

## Development

```bash
# Start API in watch mode
pnpm dev:api

# Run tests
pnpm test

# Open Prisma Studio
pnpm db:studio

# Re-seed database
pnpm db:seed

# View Swagger docs
open http://localhost:3001/docs
```
