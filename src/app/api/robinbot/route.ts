import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { message, history } = await req.json();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: "You are RobinBot, an AI assistant for ERROR404 Terminal on Robinhood Chain. Be concise, helpful, and trader-focused.",
    messages: [
      ...(history || []),
      { role: "user", content: message },
    ],
  });

  const text = response.content.find(b => b.type === "text")?.text || "";
  return NextResponse.json({ reply: text });
}
