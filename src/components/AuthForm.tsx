"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export function AuthForm({ mode }: { mode: "signup" | "signin" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "Something went wrong — please try again.");
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError(
          mode === "signup"
            ? "Your account was created but sign-in failed — try signing in."
            : "That email and password don't match — give it another try.",
        );
        return;
      }
      router.push(mode === "signup" ? "/onboarding" : "/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-stone-700">Password</span>
        <input
          type="password"
          required
          minLength={8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        {mode === "signup" && (
          <span className="text-xs text-stone-400">At least 8 characters.</span>
        )}
      </label>

      {error && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-2 rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy
          ? "One moment…"
          : mode === "signup"
            ? "Create my account"
            : "Sign in"}
      </button>

      <p className="mt-2 text-center text-sm text-stone-500">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/signin" className="font-medium text-emerald-700">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-emerald-700">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
