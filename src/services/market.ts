import { redis } from "@/lib/redis";
import axios from "axios";

const RPC = process.env.NEXT_PUBLIC_RPC_URL!;
const CACHE_TTL = 10;

export async function getTokenPrice(address: string): Promise<number | null> {
  const cached = await redis.get(`price:${address}`);
  if (cached) return parseFloat(cached);

  try {
    // Replace with actual Robinhood Chain DEX price endpoint
    const { data } = await axios.get(`${RPC}/token/price/${address}`);
    await redis.setex(`price:${address}`, CACHE_TTL, data.price.toString());
    return data.price;
  } catch {
    return null;
  }
}

export async function getTrendingTokens() {
  const cached = await redis.get("trending");
  if (cached) return JSON.parse(cached);

  try {
    const { data } = await axios.get(`${RPC}/tokens/trending`);
    await redis.setex("trending", 30, JSON.stringify(data));
    return data;
  } catch {
    return [];
  }
}

export async function searchTokens(query: string) {
  try {
    const { data } = await axios.get(`${RPC}/tokens/search?q=${encodeURIComponent(query)}`);
    return data;
  } catch {
    return [];
  }
}
