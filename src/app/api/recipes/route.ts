import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { recipeSchema } from "@/lib/validations";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const skip = (page - 1) * limit;

  const recipes = await prisma.recipe.findMany({
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      tags: { include: { tag: true } },
      _count: { select: { cookEntries: true, comments: true, favorites: true } },
    },
  });

  const total = await prisma.recipe.count();

  return NextResponse.json({ recipes, total, page, limit });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = recipeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, source, description, prepTime, cookTime, servings, ingredients, steps, tags } =
      parsed.data;

    const recipe = await prisma.recipe.create({
      data: {
        title,
        source,
        description,
        prepTime,
        cookTime,
        servings,
        authorId: user.id,
        ingredients: {
          create: ingredients.map((ing) => ({
            text: ing.text,
            position: ing.position,
          })),
        },
        steps: {
          create: steps.map((step) => ({
            text: step.text,
            position: step.position,
          })),
        },
        tags: tags
          ? {
              create: await Promise.all(
                tags.map(async (tagName) => {
                  const tag = await prisma.tag.upsert({
                    where: { name: tagName.toLowerCase() },
                    update: {},
                    create: { name: tagName.toLowerCase() },
                  });
                  return { tagId: tag.id };
                })
              ),
            }
          : undefined,
      },
      include: {
        ingredients: { orderBy: { position: "asc" } },
        steps: { orderBy: { position: "asc" } },
        tags: { include: { tag: true } },
        author: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Create feed event
    await prisma.feedEvent.create({
      data: {
        type: "new_recipe",
        userId: user.id,
        recipeId: recipe.id,
      },
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
