import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")?.split(" ")[1];
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = verifyToken(auth) as { userId: string };
  const alerts = await prisma.alert.findMany({ where: { userId } });
  return NextResponse.json(alerts);
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization")?.split(" ")[1];
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = verifyToken(auth) as { userId: string };
  const { type, token, condition, value } = await req.json();

  const alert = await prisma.alert.create({
    data: { userId, type, token, condition, value },
  });

  return NextResponse.json(alert);
}
