import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { z } from "zod";

const addItemSchema = z.object({
  recipeId: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await prisma.list.findUnique({
    where: { id: params.id },
  });

  if (!list || list.userId !== user.id) {
    return NextResponse.json(
      { error: "List not found" },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const parsed = addItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const item = await prisma.listItem.create({
      data: {
        listId: params.id,
        recipeId: parsed.data.recipeId,
      },
      include: {
        recipe: { select: { id: true, title: true } },
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Recipe already in list or not found" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await prisma.list.findUnique({
    where: { id: params.id },
  });

  if (!list || list.userId !== user.id) {
    return NextResponse.json(
      { error: "List not found" },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(request.url);
  const recipeId = searchParams.get("recipeId");

  if (!recipeId) {
    return NextResponse.json(
      { error: "recipeId is required" },
      { status: 400 }
    );
  }

  await prisma.listItem.deleteMany({
    where: { listId: params.id, recipeId },
  });

  return NextResponse.json({ success: true });
}
