import { PrismaClient } from "@prisma/client";

import { SEED_FOODS } from "../src/lib/seed-foods";

const prisma = new PrismaClient();

async function main() {
  for (const food of SEED_FOODS) {
    await prisma.food.upsert({
      where: { name: food.name },
      update: { ...food, source: "seed" },
      create: { ...food, source: "seed" },
    });
  }
  console.log(`Seeded ${SEED_FOODS.length} foods.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
