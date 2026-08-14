-- CreateEnum
CREATE TYPE "PriceSurveyNoteSide" AS ENUM ('own', 'competitor');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'price_survey_products_assigned';

-- CreateTable
CREATE TABLE "price_survey_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_survey_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_survey_submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_survey_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_survey_items" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "price_normal" DECIMAL(10,2),
    "price_promo" DECIMAL(10,2),
    "etat" TEXT,
    "competitor_name" TEXT,
    "competitor_cl" TEXT,
    "competitor_price_normal" DECIMAL(10,2),
    "competitor_price_promo" DECIMAL(10,2),
    "competitor_etat" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_survey_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_survey_notes" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "sub_area" TEXT NOT NULL,
    "side" "PriceSurveyNoteSide" NOT NULL,
    "text" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_survey_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_survey_assignments_user_id_store_id_idx" ON "price_survey_assignments"("user_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_survey_assignments_user_id_store_id_product_id_key" ON "price_survey_assignments"("user_id", "store_id", "product_id");

-- CreateIndex
CREATE INDEX "price_survey_submissions_user_id_store_id_submitted_at_idx" ON "price_survey_submissions"("user_id", "store_id", "submitted_at");

-- CreateIndex
CREATE INDEX "price_survey_items_submission_id_idx" ON "price_survey_items"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_survey_items_submission_id_product_id_key" ON "price_survey_items"("submission_id", "product_id");

-- CreateIndex
CREATE INDEX "price_survey_notes_submission_id_idx" ON "price_survey_notes"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_survey_notes_submission_id_section_sub_area_side_key" ON "price_survey_notes"("submission_id", "section", "sub_area", "side");

-- AddForeignKey
ALTER TABLE "price_survey_assignments" ADD CONSTRAINT "price_survey_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_survey_assignments" ADD CONSTRAINT "price_survey_assignments_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_survey_assignments" ADD CONSTRAINT "price_survey_assignments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_survey_submissions" ADD CONSTRAINT "price_survey_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_survey_submissions" ADD CONSTRAINT "price_survey_submissions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_survey_items" ADD CONSTRAINT "price_survey_items_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "price_survey_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_survey_items" ADD CONSTRAINT "price_survey_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_survey_notes" ADD CONSTRAINT "price_survey_notes_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "price_survey_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
