-- A planned visit now carries an hour, and nobody is in two places at once.

-- ── Give the legacy planned visits an hour ──────────────────────────────────
-- These came over from `monthly_plan_entries`, which only ever stored a day.
-- They are staggered from 09:00 within each person's day so that the
-- one-visit-per-time-slot index below can be created.
WITH ordered AS (
  SELECT "id",
         ROW_NUMBER() OVER (PARTITION BY "user_id", "planned_date" ORDER BY "id") - 1 AS slot
  FROM "visits"
  WHERE "planned_date" IS NOT NULL AND "planned_time" IS NULL
)
UPDATE "visits" v
SET "planned_time" = to_char(TIME '09:00' + (o.slot * INTERVAL '1 hour'), 'HH24:MI')
FROM ordered o
WHERE v."id" = o."id";

-- ── One point of sale per time slot, per person, per day ────────────────────
-- The existing (user, date, store) index already stops the same POS twice in a
-- day; this stops two *different* points of sale from claiming the same hour.
CREATE UNIQUE INDEX "visits_user_id_planned_date_planned_time_key"
  ON "visits"("user_id", "planned_date", "planned_time");
