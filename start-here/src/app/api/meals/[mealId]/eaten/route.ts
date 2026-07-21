import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { serializeMeal } from "@/lib/meal-engine/serialize";

const eatenSchema = z.object({ eaten: z.boolean() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ mealId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = eatenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const { mealId } = await params;
  const meal = await prisma.meal.findFirst({
    where: { id: mealId, plan: { userId: session.user.id } },
  });
  if (!meal) {
    return NextResponse.json({ error: "Meal not found." }, { status: 404 });
  }

  const updated = await prisma.meal.update({
    where: { id: meal.id },
    data: { eatenAt: parsed.data.eaten ? new Date() : null },
  });
  return NextResponse.json({ meal: serializeMeal(updated) });
}
