-- Fold "team visits" (schedules) into visit planning.
--
-- `schedules` was a second planner: an admin assigning a merchandiser one visit
-- at a time, at a given hour. That is what a month plan already does, so every
-- schedule becomes a planned `visits` row and the table goes away. The hour it
-- carried survives as `visits.planned_time`.

-- ── Planned visits gain a time of day ───────────────────────────────────────
-- `HH:mm` text, not a timestamp: "09:00 at this store" is wall-clock at the
-- point of sale and must not move with the server's timezone.
ALTER TABLE "visits" ADD COLUMN "planned_time" TEXT;

-- ── A month plan for every (user, month) that has schedules but no plan ─────
-- These months were assigned by an admin, so they land `approved` — the same
-- state a reviewer-filled month gets today.
INSERT INTO "visit_plans" ("id", "user_id", "year", "month", "status", "submitted_at", "reviewed_at", "created_at", "updated_at")
SELECT gen_random_uuid()::text,
       s."user_id",
       EXTRACT(YEAR  FROM s."scheduled_at")::int,
       EXTRACT(MONTH FROM s."scheduled_at")::int,
       'approved'::"VisitPlanStatus",
       NOW(), NOW(), NOW(), NOW()
FROM "schedules" s
GROUP BY s."user_id", EXTRACT(YEAR FROM s."scheduled_at"), EXTRACT(MONTH FROM s."scheduled_at")
ON CONFLICT ("user_id", "year", "month") DO NOTHING;

-- ── A visit already made from a schedule keeps its calendar identity ────────
UPDATE "visits" v
SET "plan_id" = p."id",
    "planned_date" = s."scheduled_at"::date,
    "planned_time" = to_char(s."scheduled_at", 'HH24:MI'),
    "planned_notes" = COALESCE(v."planned_notes", s."notes"),
    "planned_by_id" = COALESCE(v."planned_by_id", s."created_by_id")
FROM "schedules" s
JOIN "visit_plans" p
  ON p."user_id" = s."user_id"
 AND p."year"    = EXTRACT(YEAR  FROM s."scheduled_at")::int
 AND p."month"   = EXTRACT(MONTH FROM s."scheduled_at")::int
WHERE v."schedule_id" = s."id"
  AND v."planned_date" IS NULL
  -- Skip if that day/POS is already spoken for; the unique index would reject it.
  AND NOT EXISTS (
    SELECT 1 FROM "visits" w
    WHERE w."user_id" = v."user_id"
      AND w."store_id" = v."store_id"
      AND w."planned_date" = s."scheduled_at"::date
  );

-- ── Every still-pending schedule becomes a planned visit ────────────────────
-- A completed or cancelled one has either already produced its visit (relinked
-- above) or is not going to, so neither belongs on the calendar.
INSERT INTO "visits" (
  "id", "user_id", "store_id", "plan_id", "planned_date", "planned_time",
  "planned_notes", "planned_by_id", "checkin_time", "status"
)
SELECT s."id", s."user_id", s."store_id", p."id",
       s."scheduled_at"::date, to_char(s."scheduled_at", 'HH24:MI'),
       s."notes", s."created_by_id", NULL, 'planned'::"VisitStatus"
FROM "schedules" s
JOIN "visit_plans" p
  ON p."user_id" = s."user_id"
 AND p."year"    = EXTRACT(YEAR  FROM s."scheduled_at")::int
 AND p."month"   = EXTRACT(MONTH FROM s."scheduled_at")::int
WHERE s."status" = 'pending'
ON CONFLICT DO NOTHING;

-- ── Drop the second planner ─────────────────────────────────────────────────
ALTER TABLE "visits" DROP CONSTRAINT IF EXISTS "visits_schedule_id_fkey";
DROP INDEX IF EXISTS "visits_schedule_id_key";
ALTER TABLE "visits" DROP COLUMN "schedule_id";

DROP TABLE "schedules";
DROP TYPE "ScheduleStatus";

-- ── Retire the schedules.* permissions ──────────────────────────────────────
DELETE FROM "role_permissions" WHERE "permission_id" IN
  (SELECT "id" FROM "permissions" WHERE "code" LIKE 'schedules.%');
DELETE FROM "permissions" WHERE "code" LIKE 'schedules.%';
