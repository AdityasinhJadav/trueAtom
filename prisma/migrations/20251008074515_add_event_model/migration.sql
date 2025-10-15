-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "variation" TEXT NOT NULL,
    "productId" TEXT,
    "variantId" TEXT,
    "qty" INTEGER,
    "revenueCents" INTEGER,
    "path" TEXT,
    "ts" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Event_testId_variation_ts_idx" ON "Event"("testId", "variation", "ts");
