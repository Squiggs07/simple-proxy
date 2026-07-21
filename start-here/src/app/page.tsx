import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Disclaimer } from "@/components/Disclaimer";

export default async function Home() {
  const session = await auth();
  if (session?.user?.id) {
    const target = await prisma.macroTarget.findFirst({
      where: { userId: session.user.id },
    });
    redirect(target ? "/summary" : "/onboarding");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <p className="text-5xl" aria-hidden>
          🌱
        </p>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-stone-900">
          Start Here
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-stone-600">
          Want to eat better and get in shape, but not sure where to begin?
          That&apos;s exactly who this is for. Answer a few friendly questions
          and we&apos;ll give you one clear, safe starting point — no jargon, no
          overwhelming dashboards.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            href="/signup"
            className="rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Let&apos;s get started
          </Link>
          <Link
            href="/signin"
            className="rounded-xl px-6 py-3 text-base font-medium text-stone-600 hover:text-stone-900"
          >
            I already have an account
          </Link>
        </div>

        <div className="mt-12">
          <Disclaimer />
        </div>
      </div>
    </main>
  );
}
