import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { getOrCreateDayPlan, NoTargetError } from "@/lib/meal-engine/generate";
import { serializeMeal } from "@/lib/meal-engine/serialize";

const planSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD."),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const plan = await getOrCreateDayPlan(session.user.id, parsed.data.date);
    return NextResponse.json({
      id: plan.id,
      date: plan.date,
      meals: plan.meals.map(serializeMeal),
    });
  } catch (err) {
    if (err instanceof NoTargetError) {
      return NextResponse.json(
        { error: "Finish onboarding first so we know your targets." },
        { status: 409 },
      );
    }
    throw err;
  }
}
