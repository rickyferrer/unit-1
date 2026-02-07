import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { randomBytes } from "crypto";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invites = await prisma.inviteCode.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      createdAt: true,
      usedAt: true,
    },
  });

  return NextResponse.json(invites);
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = randomBytes(4).toString("hex"); // 8-char hex code

  const invite = await prisma.inviteCode.create({
    data: {
      code,
      createdById: user.id,
    },
    select: {
      id: true,
      code: true,
      createdAt: true,
    },
  });

  return NextResponse.json(invite, { status: 201 });
}
