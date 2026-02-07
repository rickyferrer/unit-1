import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["want_to_cook", "cooked"]).nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
  });

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    if (parsed.data.status === null) {
      // Remove status
      await prisma.recipeStatus.deleteMany({
        where: { userId: user.id, recipeId: params.id },
      });
      return NextResponse.json({ status: null });
    }

    const status = await prisma.recipeStatus.upsert({
      where: {
        userId_recipeId: { userId: user.id, recipeId: params.id },
      },
      update: { status: parsed.data.status },
      create: {
        userId: user.id,
        recipeId: params.id,
        status: parsed.data.status,
      },
    });

    // Create feed event
    await prisma.feedEvent.create({
      data: {
        type: "status_change",
        userId: user.id,
        recipeId: params.id,
        data: JSON.stringify({
          status: parsed.data.status,
          recipeTitle: recipe.title,
        }),
      },
    });

    return NextResponse.json(status);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
