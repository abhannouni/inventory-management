-- A planned visit now carries an hour, and nobody is in two places at once.

-- ── Give every planned visit its own free hour ──────────────────────────────
-- Two kinds of row need one:
--   • those carried over from `monthly_plan_entries`, which only ever stored a
--     day, so their hour is null;
--   • those that collide — the same person, day and hour twice.
--
-- Both are repaired in one pass, taking the first hour that (person, day) does
-- not already hold. Written as a loop rather than a windowed UPDATE because the
-- free hour depends on what the *other* rows hold, including the ones folded in
-- from `schedules` that already had a time — numbering only the null rows is
-- what made an earlier version of this migration hand out an hour that was
-- already taken, which the index below then refused.
--
-- Idempotent: a second run finds nothing null and nothing duplicated, so it is
-- safe to re-apply over a database where this migration previously failed
-- part-way through.
DO $$
DECLARE
  target RECORD;
  candidate TEXT;
  hour INT;
BEGIN
  FOR target IN
    SELECT v."id", v."user_id", v."planned_date"
    FROM "visits" v
    WHERE v."planned_date" IS NOT NULL
      AND (
        v."planned_time" IS NULL
        -- A later duplicate: the earliest row keeps the hour, the rest move.
        OR EXISTS (
          SELECT 1 FROM "visits" w
          WHERE w."user_id" = v."user_id"
            AND w."planned_date" = v."planned_date"
            AND w."planned_time" = v."planned_time"
            AND w."id" < v."id"
        )
      )
    ORDER BY v."id"
  LOOP
    candidate := NULL;

    -- Working hours first, then the rest of the clock as a fallback.
    FOREACH hour IN ARRAY ARRAY[9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,8,7,6,5,4,3,2,1,0]
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM "visits" w
        WHERE w."user_id" = target."user_id"
          AND w."planned_date" = target."planned_date"
          AND w."planned_time" = lpad(hour::text, 2, '0') || ':00'
      ) THEN
        candidate := lpad(hour::text, 2, '0') || ':00';
        EXIT;
      END IF;
    END LOOP;

    -- More than 24 visits in one person-day is not real data; leaving such a
    -- row null keeps the index buildable (nulls are distinct) instead of
    -- failing the whole deploy over it.
    IF candidate IS NOT NULL THEN
      UPDATE "visits" SET "planned_time" = candidate WHERE "id" = target."id";
    END IF;
  END LOOP;
END $$;

-- ── One point of sale per time slot, per person, per day ────────────────────
-- The existing (user, date, store) index already stops the same POS twice in a
-- day; this stops two *different* points of sale from claiming the same hour.
CREATE UNIQUE INDEX IF NOT EXISTS "visits_user_id_planned_date_planned_time_key"
  ON "visits"("user_id", "planned_date", "planned_time");
