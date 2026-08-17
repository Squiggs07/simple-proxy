import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { adjustPortion } from "@/lib/meal-engine/generate";
import { serializeMeal } from "@/lib/meal-engine/serialize";

const portionSchema = z.object({ direction: z.enum(["more", "less"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ mealId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = portionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { mealId } = await params;
  const meal = await adjustPortion(session.user.id, mealId, parsed.data.direction);
  if (!meal) {
    return NextResponse.json({ error: "Meal not found." }, { status: 404 });
  }
  return NextResponse.json({ meal: serializeMeal(meal) });
}
