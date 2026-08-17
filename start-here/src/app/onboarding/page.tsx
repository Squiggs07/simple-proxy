import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { parseExclusions } from "@/lib/exclusions";
import { OnboardingWizard, type WizardInitial } from "@/components/OnboardingWizard";

function parseJsonList(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

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
        trainingDays: profile.trainingDays,
        sessionMinutes: profile.sessionMinutes,
        equipment: profile.equipment,
        experienceLevel: profile.experienceLevel,
        confidenceLevel: profile.confidenceLevel,
        likedFoods: parseJsonList(profile.likedFoods),
        preferredCuisines: parseJsonList(profile.preferredCuisines),
        mealFormats: parseJsonList(profile.mealFormats),
        dislikes: parseJsonList(profile.dislikes),
        neverFoods: parseJsonList(profile.neverFoods),
        allergies: parseJsonList(profile.allergies),
        dietType: profile.dietType,
        breakfastStyle: profile.breakfastStyle,
        cookingMinutes: profile.cookingMinutes,
        budgetLevel: profile.budgetLevel,
        varietyPreference: profile.varietyPreference,
        mealsPerDay: profile.mealsPerDay,
        healthFlags: parseJsonList(profile.healthFlags),
      }
    : undefined;

  return (
    <main className="start-page min-h-[100dvh]">
      <div className="start-shell py-5 sm:py-8">
        <OnboardingWizard initial={initial} />
      </div>
    </main>
  );
}
