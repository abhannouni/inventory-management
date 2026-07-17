ALTER TABLE "products"
ADD COLUMN "is_our_product" BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE "products"
SET
  "is_our_product" = TRUE,
  "distributeur" = 'Bourchanin'
WHERE LOWER(REGEXP_REPLACE("distributeur", '[^a-z0-9]+', '', 'g')) IN (
  'bourchanin',
  'bourchaninandcie',
  'bourchaninetcie'
);
