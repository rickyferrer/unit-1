import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(
  _request: Request,
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
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_recipeId: { userId: user.id, recipeId: params.id },
      },
    });

    if (existing) {
      // Unfavorite
      await prisma.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ favorited: false });
    }

    // Favorite
    await prisma.favorite.create({
      data: { userId: user.id, recipeId: params.id },
    });

    // Create feed event
    await prisma.feedEvent.create({
      data: {
        type: "favorite",
        userId: user.id,
        recipeId: params.id,
        data: JSON.stringify({ recipeTitle: recipe.title }),
      },
    });

    return NextResponse.json({ favorited: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
