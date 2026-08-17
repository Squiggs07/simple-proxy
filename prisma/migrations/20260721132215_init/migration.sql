-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "sexAtBirth" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "activityLevel" TEXT NOT NULL,
    "exclusions" TEXT NOT NULL DEFAULT '',
    "mealPriority" TEXT NOT NULL DEFAULT 'balanced',
    "units" TEXT NOT NULL DEFAULT 'imperial',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "fdcId" INTEGER,
    "name" TEXT NOT NULL,
    "kcalPer100g" DOUBLE PRECISION NOT NULL,
    "proteinPer100g" DOUBLE PRECISION NOT NULL,
    "carbsPer100g" DOUBLE PRECISION NOT NULL,
    "fatPer100g" DOUBLE PRECISION NOT NULL,
    "gramsPerUnit" DOUBLE PRECISION,
    "unitName" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "whyThisFits" TEXT NOT NULL DEFAULT '',
    "steps" TEXT NOT NULL DEFAULT '[]',
    "ingredients" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "budgetKcal" INTEGER NOT NULL,
    "portionFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "eatenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeighIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeighIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MacroTarget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "maintenanceCalories" INTEGER NOT NULL,
    "planType" TEXT NOT NULL,
    "flags" TEXT NOT NULL DEFAULT '[]',
    "inputs" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MacroTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Food_fdcId_key" ON "Food"("fdcId");

-- CreateIndex
CREATE UNIQUE INDEX "Food_name_key" ON "Food"("name");

-- CreateIndex
CREATE INDEX "Food_name_idx" ON "Food"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_userId_date_key" ON "MealPlan"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "WeighIn_userId_date_key" ON "WeighIn"("userId", "date");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeighIn" ADD CONSTRAINT "WeighIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MacroTarget" ADD CONSTRAINT "MacroTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
