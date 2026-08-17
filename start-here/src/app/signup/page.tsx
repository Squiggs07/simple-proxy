import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AuthForm } from "@/components/AuthForm";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-stone-900">
          Welcome! Let&apos;s make you an account.
        </h1>
        <p className="mt-2 text-stone-600">
          Just an email and password — the friendly questions come next.
        </p>
        <div className="mt-8">
          <AuthForm mode="signup" />
        </div>
      </div>
    </main>
  );
}
