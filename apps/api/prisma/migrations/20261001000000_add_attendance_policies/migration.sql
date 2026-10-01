-- CreateEnum
CREATE TYPE "VisitLocationScope" AS ENUM ('visit_period', 'visit_day');

-- AlterTable
ALTER TABLE "work_sessions" ADD COLUMN "clock_in_lat" DECIMAL(10,7),
ADD COLUMN "clock_in_lng" DECIMAL(10,7),
ADD COLUMN "clock_out_lat" DECIMAL(10,7),
ADD COLUMN "clock_out_lng" DECIMAL(10,7);

-- CreateTable
CREATE TABLE "work_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "radius_meters" INTEGER NOT NULL DEFAULT 150,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_policies" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "allow_work_locations" BOOLEAN NOT NULL DEFAULT true,
    "allow_visit_stores" BOOLEAN NOT NULL DEFAULT false,
    "allow_assigned_stores" BOOLEAN NOT NULL DEFAULT false,
    "visit_scope" "VisitLocationScope" NOT NULL DEFAULT 'visit_period',
    "visit_margin_minutes" INTEGER NOT NULL DEFAULT 30,
    "store_radius_meters" INTEGER NOT NULL DEFAULT 150,
    "count_off_site" BOOLEAN NOT NULL DEFAULT false,
    "count_unverified" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_policy_locations" (
    "policy_id" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,

    CONSTRAINT "attendance_policy_locations_pkey" PRIMARY KEY ("policy_id","location_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_policies_user_id_key" ON "attendance_policies"("user_id");

-- CreateIndex
CREATE INDEX "attendance_policy_locations_location_id_idx" ON "attendance_policy_locations"("location_id");

-- AddForeignKey
ALTER TABLE "attendance_policies" ADD CONSTRAINT "attendance_policies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_policies" ADD CONSTRAINT "attendance_policies_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_policy_locations" ADD CONSTRAINT "attendance_policy_locations_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "attendance_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_policy_locations" ADD CONSTRAINT "attendance_policy_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "work_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
