import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseExclusions } from "@/lib/exclusions";
import { OnboardingWizard, type WizardInitial } from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  const initial: WizardInitial | undefined = profile
    ? {
        goal: profile.goal,
        sexAtBirth: profile.sexAtBirth,
        age: profile.age,
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        activityLevel: profile.activityLevel,
        exclusions: parseExclusions(profile.exclusions),
        mealPriority: profile.mealPriority,
        units: profile.units,
      }
    : undefined;

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <OnboardingWizard initial={initial} />
    </main>
  );
}
