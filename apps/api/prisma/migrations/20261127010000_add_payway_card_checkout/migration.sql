CREATE TYPE "PaymentMethod" AS ENUM ('KHQR', 'CARD');
ALTER TABLE "Booking" RENAME COLUMN "paymentQrExpiresAt" TO "paymentExpiresAt";
ALTER TABLE "Booking" ADD COLUMN "paymentMethod" "PaymentMethod";
UPDATE "Booking" SET "paymentMethod" = 'KHQR' WHERE "paymentExpiresAt" IS NOT NULL;
