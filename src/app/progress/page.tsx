import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ProgressView } from "@/components/ProgressView";

export default async function ProgressPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  return (
    <main className="flex flex-1 flex-col px-4 py-8 sm:px-6">
      <ProgressView />
    </main>
  );
}
