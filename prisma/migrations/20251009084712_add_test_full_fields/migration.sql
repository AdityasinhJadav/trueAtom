-- AlterTable
ALTER TABLE "Test" ADD COLUMN "description" TEXT;
ALTER TABLE "Test" ADD COLUMN "duration" INTEGER;
ALTER TABLE "Test" ADD COLUMN "durationUnit" TEXT;
ALTER TABLE "Test" ADD COLUMN "hypothesis" TEXT;
ALTER TABLE "Test" ADD COLUMN "selectedProducts" JSONB;
ALTER TABLE "Test" ADD COLUMN "stoppedVariations" JSONB;
ALTER TABLE "Test" ADD COLUMN "targeting" JSONB;
