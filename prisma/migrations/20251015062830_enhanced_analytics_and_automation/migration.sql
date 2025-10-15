-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "city" TEXT;
ALTER TABLE "Customer" ADD COLUMN "country" TEXT;
ALTER TABLE "Customer" ADD COLUMN "region" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "language" TEXT;
ALTER TABLE "Event" ADD COLUMN "referrer" TEXT;
ALTER TABLE "Event" ADD COLUMN "screenResolution" TEXT;
ALTER TABLE "Event" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "Event" ADD COLUMN "timezone" TEXT;
ALTER TABLE "Event" ADD COLUMN "userAgent" TEXT;
ALTER TABLE "Event" ADD COLUMN "viewportSize" TEXT;
ALTER TABLE "Event" ADD COLUMN "visitorId" TEXT;

-- CreateTable
CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AutomationLog_testId_timestamp_idx" ON "AutomationLog"("testId", "timestamp");

-- CreateIndex
CREATE INDEX "Customer_country_state_idx" ON "Customer"("country", "state");

-- CreateIndex
CREATE INDEX "Event_visitorId_ts_idx" ON "Event"("visitorId", "ts");

-- CreateIndex
CREATE INDEX "Event_sessionId_ts_idx" ON "Event"("sessionId", "ts");
