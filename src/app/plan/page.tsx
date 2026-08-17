import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DayPlan } from "@/components/DayPlan";

export default async function PlanPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const target = await prisma.macroTarget.findFirst({
    where: { userId: session.user.id },
    orderBy: { computedAt: "desc" },
  });
  if (!target) redirect("/onboarding");

  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:px-6">
      <DayPlan
        targetKcal={target.calories}
        targetProteinG={target.proteinG}
      />
    </main>
  );
}
