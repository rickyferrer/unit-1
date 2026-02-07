import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { cookEntrySchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  const entries = await prisma.cookEntry.findMany({
    where: { recipeId: params.id },
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { cookedAt: "desc" },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return NextResponse.json(entries);
}

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
    const parsed = cookEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const entry = await prisma.cookEntry.create({
      data: {
        userId: user.id,
        recipeId: params.id,
        cookedAt: parsed.data.cookedAt
          ? new Date(parsed.data.cookedAt)
          : new Date(),
        rating: parsed.data.rating,
        caption: parsed.data.caption,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        recipe: { select: { id: true, title: true } },
      },
    });

    // Update recipe status to cooked
    await prisma.recipeStatus.upsert({
      where: {
        userId_recipeId: { userId: user.id, recipeId: params.id },
      },
      update: { status: "cooked" },
      create: {
        userId: user.id,
        recipeId: params.id,
        status: "cooked",
      },
    });

    // Create feed event
    await prisma.feedEvent.create({
      data: {
        type: "cook_entry",
        userId: user.id,
        recipeId: params.id,
        cookEntryId: entry.id,
        data: JSON.stringify({
          rating: entry.rating,
          caption: entry.caption,
          recipeTitle: recipe.title,
        }),
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
