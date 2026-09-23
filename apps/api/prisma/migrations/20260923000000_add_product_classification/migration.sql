-- CreateEnum
CREATE TYPE "ProductClassification" AS ENUM ('standard', 'premium', 'ultra_premium');

-- AlterTable: nullable, so existing products keep no classification
ALTER TABLE "products" ADD COLUMN "classification" "ProductClassification";
