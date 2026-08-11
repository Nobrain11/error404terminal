import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ca = searchParams.get("ca");
  const price = searchParams.get("price");
  const tf = searchParams.get("tf") || "1H";

  if (!ca) return NextResponse.json({ error: "Missing ca" }, { status: 400 });

  // Log a snapshot on every call (cheap, keeps history growing)
  if (price) {
    await prisma.priceSnapshot.create({
      data: { tokenCa: ca, price: parseFloat(price) },
    });
  }

  const rangeMs: Record<string, number> = {
    "1m": 60 * 60 * 1000,
    "5m": 6 * 60 * 60 * 1000,
    "15m": 24 * 60 * 60 * 1000,
    "1H": 3 * 24 * 60 * 60 * 1000,
    "4H": 7 * 24 * 60 * 60 * 1000,
    "1D": 30 * 24 * 60 * 60 * 1000,
    "1W": 90 * 24 * 60 * 60 * 1000,
  };

  const since = new Date(Date.now() - (rangeMs[tf] || rangeMs["1H"]));

  const points = await prisma.priceSnapshot.findMany({
    where: { tokenCa: ca, timestamp: { gte: since } },
    orderBy: { timestamp: "asc" },
    take: 500,
  });

  return NextResponse.json(
    points.map((p) => ({
      time: Math.floor(p.timestamp.getTime() / 1000),
      value: p.price,
    }))
  );
}
