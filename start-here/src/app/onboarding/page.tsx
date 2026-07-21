import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { OnboardingWizard } from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  return (
    <main className="flex flex-1 flex-col px-6 py-8">
      <OnboardingWizard />
    </main>
  );
}
