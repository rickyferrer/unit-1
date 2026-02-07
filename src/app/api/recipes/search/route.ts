import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const tag = searchParams.get("tag")?.trim();
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

  if (!q && !tag) {
    return NextResponse.json(
      { error: "Provide q or tag parameter" },
      { status: 400 }
    );
  }

  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { title: { contains: q } },
      { ingredients: { some: { text: { contains: q } } } },
    ];
  }

  if (tag) {
    where.tags = { some: { tag: { name: tag.toLowerCase() } } };
  }

  const recipes = await prisma.recipe.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      tags: { include: { tag: true } },
      _count: { select: { cookEntries: true, favorites: true } },
    },
  });

  return NextResponse.json(recipes);
}
