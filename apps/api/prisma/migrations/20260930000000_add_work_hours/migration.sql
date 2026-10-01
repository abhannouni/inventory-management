-- CreateEnum
CREATE TYPE "WorkSessionSource" AS ENUM ('clock', 'manual');

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "role_id" TEXT,
    "user_id" TEXT,
    "days" JSONB,
    "effective_from" DATE NOT NULL,
    "note" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clock_in" TIMESTAMP(3) NOT NULL,
    "clock_out" TIMESTAMP(3),
    "source" "WorkSessionSource" NOT NULL DEFAULT 'clock',
    "note" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_schedules_user_id_effective_from_idx" ON "work_schedules"("user_id", "effective_from");

-- CreateIndex
CREATE INDEX "work_schedules_role_id_effective_from_idx" ON "work_schedules"("role_id", "effective_from");

-- CreateIndex
CREATE INDEX "work_sessions_user_id_clock_in_idx" ON "work_sessions"("user_id", "clock_in");

-- CreateIndex
CREATE INDEX "work_sessions_clock_out_idx" ON "work_sessions"("clock_out");

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A schedule belongs to exactly one owner: a role (its default) or a user (an override).
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_owner_check" CHECK (("role_id" IS NULL) <> ("user_id" IS NULL));
