import { NextRequest, NextResponse } from "next/server";
import { scanContract } from "@/services/scanner";

export async function POST(req: NextRequest) {
  const { address } = await req.json();
  if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });

  const result = await scanContract(address);
  return NextResponse.json(result);
}
