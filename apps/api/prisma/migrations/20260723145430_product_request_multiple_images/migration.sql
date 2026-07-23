-- Add the new multi-photo column, backfill it from the old single-photo
-- column, then drop the old column.
ALTER TABLE "product_requests" ADD COLUMN "image_urls" TEXT[] NOT NULL DEFAULT '{}';

UPDATE "product_requests" SET "image_urls" = ARRAY[image_url] WHERE image_url IS NOT NULL;

ALTER TABLE "product_requests" ALTER COLUMN "image_urls" DROP DEFAULT;

ALTER TABLE "product_requests" DROP COLUMN "image_url";
