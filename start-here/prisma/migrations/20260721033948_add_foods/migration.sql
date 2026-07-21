-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fdcId" INTEGER,
    "name" TEXT NOT NULL,
    "kcalPer100g" REAL NOT NULL,
    "proteinPer100g" REAL NOT NULL,
    "carbsPer100g" REAL NOT NULL,
    "fatPer100g" REAL NOT NULL,
    "gramsPerUnit" REAL,
    "unitName" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Food_fdcId_key" ON "Food"("fdcId");

-- CreateIndex
CREATE UNIQUE INDEX "Food_name_key" ON "Food"("name");

-- CreateIndex
CREATE INDEX "Food_name_idx" ON "Food"("name");
