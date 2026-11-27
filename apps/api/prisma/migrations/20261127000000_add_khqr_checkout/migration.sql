ALTER TABLE "Booking"
  ADD COLUMN "paymentAmount" DECIMAL(14, 2),
  ADD COLUMN "paymentQrImage" TEXT,
  ADD COLUMN "paymentQrExpiresAt" TIMESTAMP(3);
