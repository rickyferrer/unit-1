import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { recipeSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      ingredients: { orderBy: { position: "asc" } },
      steps: { orderBy: { position: "asc" } },
      tags: { include: { tag: true } },
      cookEntries: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { cookedAt: "desc" },
        take: 10,
      },
      _count: { select: { cookEntries: true, comments: true, favorites: true } },
    },
  });

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  // Get current user's status and favorite for this recipe
  const [status, favorite] = await Promise.all([
    prisma.recipeStatus.findUnique({
      where: { userId_recipeId: { userId: user.id, recipeId: params.id } },
    }),
    prisma.favorite.findUnique({
      where: { userId_recipeId: { userId: user.id, recipeId: params.id } },
    }),
  ]);

  return NextResponse.json({
    ...recipe,
    userStatus: status?.status ?? null,
    isFavorited: !!favorite,
  });
}

export async function PATCH(
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

  if (recipe.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = recipeSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { ingredients, steps, tags, ...rest } = parsed.data;

    const updated = await prisma.recipe.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(ingredients && {
          ingredients: {
            deleteMany: {},
            create: ingredients.map((ing) => ({
              text: ing.text,
              position: ing.position,
            })),
          },
        }),
        ...(steps && {
          steps: {
            deleteMany: {},
            create: steps.map((step) => ({
              text: step.text,
              position: step.position,
            })),
          },
        }),
        ...(tags && {
          tags: {
            deleteMany: {},
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
          },
        }),
      },
      include: {
        ingredients: { orderBy: { position: "asc" } },
        steps: { orderBy: { position: "asc" } },
        tags: { include: { tag: true } },
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

  if (recipe.authorId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.recipe.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
