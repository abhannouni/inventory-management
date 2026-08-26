-- Merge monthly planning into visits.
--
-- `monthly_plan_entries` is gone: a planned day is now a `visits` row with
-- status = 'planned' and no check-in yet. `monthly_plans` survives, slimmed
-- and renamed to `visit_plans`, holding only the month's review state.

-- ── VisitStatus gains `planned` ─────────────────────────────────────────────
-- Recreated rather than `ALTER TYPE ... ADD VALUE`, because a value added that
-- way cannot be used later in the same transaction — and the backfill below
-- needs to write 'planned' straight away.
-- The "one open visit per user" partial index has `status = 'open'` baked into
-- its predicate, still typed against the old enum — it has to go and come back
-- around the swap, or rebuilding it mid-ALTER fails on the type mismatch.
DROP INDEX "visits_one_open_per_user";
ALTER TYPE "VisitStatus" RENAME TO "VisitStatus_old";
CREATE TYPE "VisitStatus" AS ENUM ('planned', 'open', 'completed');
ALTER TABLE "visits" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "visits" ALTER COLUMN "status" TYPE "VisitStatus" USING "status"::text::"VisitStatus";
ALTER TABLE "visits" ALTER COLUMN "status" SET DEFAULT 'open';
DROP TYPE "VisitStatus_old";
CREATE UNIQUE INDEX "visits_one_open_per_user" ON "visits"("user_id") WHERE "status" = 'open';

-- ── Notification types follow the rename ────────────────────────────────────
ALTER TYPE "NotificationType" RENAME VALUE 'monthly_plan_submitted' TO 'visit_plan_submitted';
ALTER TYPE "NotificationType" RENAME VALUE 'monthly_plan_changed'   TO 'visit_plan_changed';
ALTER TYPE "NotificationType" RENAME VALUE 'monthly_plan_approved'  TO 'visit_plan_approved';
ALTER TYPE "NotificationType" RENAME VALUE 'monthly_plan_declined'  TO 'visit_plan_declined';
ALTER TYPE "NotificationType" RENAME VALUE 'monthly_plan_adjusted'  TO 'visit_plan_adjusted';
ALTER TYPE "NotificationType" RENAME VALUE 'monthly_plan_reminder'  TO 'visit_plan_reminder';
ALTER TYPE "NotificationType" RENAME VALUE 'monthly_plan_missing'   TO 'visit_plan_missing';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'visit_plan_assigned';

ALTER TYPE "MonthlyPlanStatus" RENAME TO "VisitPlanStatus";

-- ── visit_plans (was monthly_plans) ─────────────────────────────────────────
ALTER TABLE "monthly_plans" RENAME TO "visit_plans";
ALTER INDEX "monthly_plans_pkey"                   RENAME TO "visit_plans_pkey";
ALTER INDEX "monthly_plans_status_idx"             RENAME TO "visit_plans_status_idx";
ALTER INDEX "monthly_plans_user_id_year_month_key" RENAME TO "visit_plans_user_id_year_month_key";

-- ── visits gain the plan columns ────────────────────────────────────────────
ALTER TABLE "visits" ADD COLUMN "plan_id"       TEXT,
                     ADD COLUMN "planned_date"  DATE,
                     ADD COLUMN "planned_notes" TEXT,
                     ADD COLUMN "planned_by_id" TEXT;

-- A planned visit has no check-in yet.
ALTER TABLE "visits" ALTER COLUMN "checkin_time" DROP NOT NULL;

-- ── Keep the plan link on visits that were already checked into ─────────────
-- Done before the FK column is dropped, otherwise the link is lost.
UPDATE "visits" v
SET "plan_id"       = e."plan_id",
    "planned_date"  = e."date",
    "planned_notes" = e."notes",
    "planned_by_id" = v."user_id"
FROM "monthly_plan_entries" e
WHERE v."monthly_plan_entry_id" = e."id";

-- Old data had no same-day/same-POS rule, so two entries could land on one day.
-- Only the earliest keeps its calendar identity; the rest stay as plain visits
-- so the unique index below can be created.
UPDATE "visits" v
SET "plan_id" = NULL, "planned_date" = NULL, "planned_notes" = NULL, "planned_by_id" = NULL
WHERE v."planned_date" IS NOT NULL
  AND v."id" <> (
    SELECT w."id" FROM "visits" w
    WHERE w."user_id" = v."user_id"
      AND w."store_id" = v."store_id"
      AND w."planned_date" = v."planned_date"
    ORDER BY w."checkin_time" NULLS LAST, w."id"
    LIMIT 1
  );

ALTER TABLE "visits" DROP CONSTRAINT IF EXISTS "visits_monthly_plan_entry_id_fkey";
ALTER TABLE "visits" DROP COLUMN "monthly_plan_entry_id";

-- ── Constraints, before the backfill so ON CONFLICT has something to catch ──
CREATE INDEX "visits_plan_id_idx"      ON "visits"("plan_id");
CREATE INDEX "visits_planned_date_idx" ON "visits"("planned_date");
-- Nobody visits the same point of sale twice on the same day. Postgres treats
-- NULLs as distinct, so this only binds rows carrying a `planned_date`.
CREATE UNIQUE INDEX "visits_user_id_planned_date_store_id_key"
  ON "visits"("user_id", "planned_date", "store_id");

ALTER TABLE "visits" ADD CONSTRAINT "visits_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "visit_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "visits" ADD CONSTRAINT "visits_planned_by_id_fkey"
  FOREIGN KEY ("planned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Carry the not-yet-visited entries over as planned visits ────────────────
-- An entry whose visit already exists (linked above) conflicts on the unique
-- index and is skipped, so no day ends up duplicated.
INSERT INTO "visits" (
  "id", "user_id", "store_id", "plan_id", "planned_date", "planned_notes",
  "planned_by_id", "checkin_time", "status"
)
SELECT e."id", p."user_id", e."store_id", e."plan_id", e."date", e."notes",
       p."user_id", NULL, 'planned'::"VisitStatus"
FROM "monthly_plan_entries" e
JOIN "visit_plans" p ON p."id" = e."plan_id"
WHERE e."status" = 'pending'
ON CONFLICT DO NOTHING;

DROP TABLE "monthly_plan_entries";
DROP TYPE "MonthlyPlanEntryStatus";

-- ── Retire the monthly_plans.* permissions ──────────────────────────────────
-- Their `visit_plans.*` replacements are seeded by syncRbac on next boot.
DELETE FROM "role_permissions" WHERE "permission_id" IN
  (SELECT "id" FROM "permissions" WHERE "code" LIKE 'monthly_plans.%');
DELETE FROM "permissions" WHERE "code" LIKE 'monthly_plans.%';
