-- CreateTable
CREATE TABLE "Design" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "shape" TEXT NOT NULL,
    "length" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "depth" DOUBLE PRECISION NOT NULL,
    "poolTile" TEXT NOT NULL,
    "coping" TEXT NOT NULL,
    "deck" TEXT NOT NULL,
    "water" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'studio',
    "config" JSONB NOT NULL,
    "previewSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Design_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Design_createdAt_idx" ON "Design"("createdAt");
