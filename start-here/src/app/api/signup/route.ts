import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const signupSchema = z.object({
  email: z.email("That doesn't look like an email address."),
  password: z.string().min(8, "Passwords need at least 8 characters."),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`signup:${ip}`, 5, 15 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Too many attempts — please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "There's already an account with that email — try signing in." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.create({ data: { email, passwordHash } });

  return NextResponse.json({ ok: true }, { status: 201 });
}
