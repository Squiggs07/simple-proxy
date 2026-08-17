import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { swapMeal } from "@/lib/meal-engine/generate";
import { serializeMeal } from "@/lib/meal-engine/serialize";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ mealId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { mealId } = await params;
  const meal = await swapMeal(session.user.id, mealId);
  if (!meal) {
    return NextResponse.json(
      { error: "Couldn't find another meal that fits — try again in a moment." },
      { status: 404 },
    );
  }
  return NextResponse.json({ meal: serializeMeal(meal) });
}
