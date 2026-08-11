import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { prisma } from "@/lib/prisma";

const RPC_URL = process.env.RPC_URL || "https://rpc.robinhoodchain.com";
const MAX_SYNC_BLOCKS = 45000; // per-request cap so eth_getLogs doesn't time out
const INITIAL_LOOKBACK_BLOCKS = 200000; // first-ever sync for a pair

const PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)",
];

const ERC20_ABI = ["function decimals() view returns (uint8)"];

const BUCKET_SECONDS: Record<string, number> = {
  "1m": 60, "5m": 300, "15m": 900, "30m": 1800,
  "1H": 3600, "4H": 14400, "1D": 86400, "1W": 604800,
};

const WINDOW_SECONDS: Record<string, number> = {
  "1m": 7200, "5m": 43200, "15m": 172800, "30m": 345600,
  "1H": 604800, "4H": 2592000, "1D": 7776000, "1W": 31536000,
};

async function syncSwaps(pairAddress: string, tokenCa: string) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

  const [token0, token1] = await Promise.all([pair.token0(), pair.token1()]);
  const isToken0 = token0.toLowerCase() === tokenCa.toLowerCase();

  const targetAddress = isToken0 ? token0 : token1;
  const targetContract = new ethers.Contract(targetAddress, ERC20_ABI, provider);
  const decimals = await targetContract.decimals();

  const latestBlock = await provider.getBlockNumber();

  const lastSynced = await prisma.swapEvent.findFirst({
    where: { pairAddress },
    orderBy: { blockNumber: "desc" },
    select: { blockNumber: true },
  });

  let fromBlock: number;
  if (lastSynced) {
    fromBlock = lastSynced.blockNumber + 1;
  } else {
    fromBlock = Math.max(0, latestBlock - INITIAL_LOOKBACK_BLOCKS);
  }

  if (fromBlock > latestBlock) return { decimals, isToken0 };

  const toBlock = Math.min(latestBlock, fromBlock + MAX_SYNC_BLOCKS);

  const filter = pair.filters.Swap();
  const logs = await pair.queryFilter(filter, fromBlock, toBlock);

  if (logs.length === 0) return { decimals, isToken0 };

  const uniqueBlockNumbers = Array.from(new Set(logs.map((l: any) => l.blockNumber)));
  const blockTimestamps = new Map<number, number>();
  await Promise.all(
    uniqueBlockNumbers.map(async (bn) => {
      const block = await provider.getBlock(bn);
      if (block) blockTimestamps.set(bn, block.timestamp);
    })
  );

  const rows = [];
  for (const log of logs as any[]) {
    const { amount0In, amount1In, amount0Out, amount1Out } = log.args;
    const ts = blockTimestamps.get(log.blockNumber);
    if (ts === undefined) continue;

    const ourIn = isToken0 ? amount0In : amount1In;
    const ourOut = isToken0 ? amount0Out : amount1Out;
    const otherIn = isToken0 ? amount1In : amount0In;
    const otherOut = isToken0 ? amount1Out : amount0Out;

    const ourAmountRaw = ourOut > 0n ? ourOut : ourIn;
    const otherAmountRaw = otherOut > 0n ? otherOut : otherIn;
    if (ourAmountRaw === 0n) continue;

    const rawRatio = Number(otherAmountRaw) / Number(ourAmountRaw);
    if (!isFinite(rawRatio) || rawRatio <= 0) continue;

    rows.push({
      pairAddress,
      tokenCa,
      txHash: log.transactionHash,
      logIndex: log.index ?? 0,
      blockNumber: log.blockNumber,
      timestamp: new Date(ts * 1000),
      isBuy: ourOut > 0n,
      rawRatio,
      ourAmount: parseFloat(ethers.formatUnits(ourAmountRaw, decimals)),
      otherAmount: parseFloat(ethers.formatUnits(otherAmountRaw, decimals)),
    });
  }

  if (rows.length > 0) {
    await prisma.swapEvent.createMany({ data: rows, skipDuplicates: true });
  }

  return { decimals, isToken0 };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pairAddress = searchParams.get("pairAddress");
  const tokenCa = searchParams.get("ca");
  const tf = searchParams.get("tf") || "1H";
  const currentPrice = parseFloat(searchParams.get("price") || "0");

  if (!pairAddress || !tokenCa) {
    return NextResponse.json({ error: "Missing pairAddress or ca" }, { status: 400 });
  }
  if (!currentPrice || currentPrice <= 0) {
    return NextResponse.json({
      candles: [], volume: [], state: "error",
      note: "Missing live reference price",
    });
  }

  const bucketSeconds = BUCKET_SECONDS[tf] || BUCKET_SECONDS["1H"];
  const windowSeconds = WINDOW_SECONDS[tf] || WINDOW_SECONDS["1H"];

  try {
    await syncSwaps(pairAddress, tokenCa);

    const since = new Date(Date.now() - windowSeconds * 1000);
    const swaps = await prisma.swapEvent.findMany({
      where: { pairAddress, timestamp: { gte: since } },
      orderBy: { timestamp: "asc" },
    });

    const dataSourceNote = "On-chain OHLCV · Derived from Swap events";
    const usdNote = "USD values are normalized using the available reference price.";

    if (swaps.length === 0) {
      return NextResponse.json({
        candles: [], volume: [], state: "empty",
        message: "No on-chain trades available for this period.",
        dataSourceNote, usdNote,
      });
    }

    // Anchor: most recent swap overall gives us ratio-to-USD scale
    const mostRecent = await prisma.swapEvent.findFirst({
      where: { pairAddress },
      orderBy: { timestamp: "desc" },
    });
    const anchorRatio = mostRecent?.rawRatio || swaps[swaps.length - 1].rawRatio;
    const scale = currentPrice / anchorRatio;

    type Bucket = {
      o: number; h: number; l: number; c: number;
      rawO: number; rawH: number; rawL: number; rawC: number;
      vol: number; trades: number;
    };
    const buckets = new Map<number, Bucket>();

    for (const s of swaps) {
      const usdPrice = s.rawRatio * scale;
      const bucketTime = Math.floor(s.timestamp.getTime() / 1000 / bucketSeconds) * bucketSeconds;
      const usdVolume = s.ourAmount * usdPrice;

      const existing = buckets.get(bucketTime);
      if (!existing) {
        buckets.set(bucketTime, {
          o: usdPrice, h: usdPrice, l: usdPrice, c: usdPrice,
          rawO: s.rawRatio, rawH: s.rawRatio, rawL: s.rawRatio, rawC: s.rawRatio,
          vol: usdVolume, trades: 1,
        });
      } else {
        existing.h = Math.max(existing.h, usdPrice);
        existing.l = Math.min(existing.l, usdPrice);
        existing.c = usdPrice;
        existing.rawH = Math.max(existing.rawH, s.rawRatio);
        existing.rawL = Math.min(existing.rawL, s.rawRatio);
        existing.rawC = s.rawRatio;
        existing.vol += usdVolume;
        existing.trades += 1;
      }
    }

    const sortedTimes = Array.from(buckets.keys()).sort((a, b) => a - b);

    const candles = sortedTimes.map((time) => {
      const b = buckets.get(time)!;
      return {
        time,
        open: b.o, high: b.h, low: b.l, close: b.c,
        rawOnChainOpen: b.rawO, rawOnChainHigh: b.rawH, rawOnChainLow: b.rawL, rawOnChainClose: b.rawC,
        trades: b.trades,
      };
    });

    const volume = sortedTimes.map((time) => {
      const b = buckets.get(time)!;
      return {
        time,
        value: b.vol,
        color: b.c >= b.o ? "rgba(0,200,5,0.5)" : "rgba(255,59,48,0.5)",
      };
    });

    return NextResponse.json({
      candles, volume, state: "ok",
      dataSourceNote, usdNote,
    });
  } catch (err) {
    console.error("Candles fetch error:", err);
    return NextResponse.json({ candles: [], volume: [], state: "error" }, { status: 200 });
  }
}
