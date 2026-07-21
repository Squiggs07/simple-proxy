-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "whyThisFits" TEXT NOT NULL DEFAULT '',
    "steps" TEXT NOT NULL DEFAULT '[]',
    "ingredients" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteinG" REAL NOT NULL,
    "carbsG" REAL NOT NULL,
    "fatG" REAL NOT NULL,
    "budgetKcal" INTEGER NOT NULL,
    "portionFactor" REAL NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Meal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MealPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_userId_date_key" ON "MealPlan"("userId", "date");
