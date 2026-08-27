-- Correct the times carried over from `schedules`.
--
-- `schedules.scheduled_at` was a `timestamp` holding UTC, so reading the hour
-- straight out of it produced the UTC wall clock (07:30) rather than the local
-- one the old screen actually displayed (08:30). `planned_time` is meant to be
-- local wall clock at the point of sale, so those values are an hour off.
--
-- Rebuilds the UTC instant from (planned_date + planned_time) and re-renders it
-- in the timezone the points of sale are actually in. That zone is written out
-- rather than read from `current_setting('TimeZone')`: the database server's own
-- zone is an accident of where it is hosted — UTC on a cloud host, local on a
-- developer machine — and using it would make this correction do nothing in
-- production while doing the right thing locally. Per-row, so DST is handled.
--
-- Runs immediately after the fold, before anyone can have typed a time by hand,
-- so every row carrying a `planned_time` at this point came from that migration
-- and the blanket update is safe. This is also why the correction lives here
-- rather than being folded into the previous migration: that one is already
-- applied, and editing an applied migration breaks its checksum.
UPDATE "visits"
SET "planned_time" = to_char(
  ("planned_date" + "planned_time"::time) AT TIME ZONE 'UTC' AT TIME ZONE 'Africa/Casablanca',
  'HH24:MI'
)
WHERE "planned_time" IS NOT NULL
  AND "planned_date" IS NOT NULL;
