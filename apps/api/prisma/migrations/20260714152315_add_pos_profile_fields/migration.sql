-- CreateEnum
CREATE TYPE "StoreChannel" AS ENUM ('gms', 'ls');

-- CreateEnum
CREATE TYPE "StoreClassification" AS ENUM ('A', 'B', 'C', 'D');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "channel" "StoreChannel",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "classification" "StoreClassification",
ADD COLUMN     "department_manager_name" TEXT,
ADD COLUMN     "department_manager_phone" TEXT,
ADD COLUMN     "gds_name" TEXT,
ADD COLUMN     "gds_phone" TEXT,
ADD COLUMN     "google_maps_url" TEXT,
ADD COLUMN     "opening_date" DATE,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "section_manager_name" TEXT,
ADD COLUMN     "section_manager_phone" TEXT;

-- CreateIndex
CREATE INDEX "stores_city_idx" ON "stores"("city");

-- CreateIndex
CREATE INDEX "stores_brand_idx" ON "stores"("brand");
