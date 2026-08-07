import { NextRequest, NextResponse } from "next/server";
import { getTrendingTokens, searchTokens } from "@/services/market";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  const tokens = q ? await searchTokens(q) : await getTrendingTokens();
  return NextResponse.json(tokens);
}
