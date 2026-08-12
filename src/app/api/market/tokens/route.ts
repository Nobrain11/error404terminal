import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const RPC_URL = process.env.RPC_URL || "https://rpc.robinhoodchain.com";

const PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)",
];

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pairAddress = searchParams.get("pairAddress");
  const tokenAddress = searchParams.get("ca");
  const price = parseFloat(searchParams.get("price") || "0");
  const sideFilter = searchParams.get("side"); // "buy" | "sell" | null
  const walletFilter = searchParams.get("wallet")?.toLowerCase();
  const minSize = parseFloat(searchParams.get("minSize") || "0");

  if (!pairAddress || !tokenAddress) {
    return NextResponse.json({ error: "Missing pairAddress or ca" }, { status: 400 });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const pair = new ethers.Contract(pairAddress, PAIR_ABI, provider);

    const [token0, token1] = await Promise.all([pair.token0(), pair.token1()]);
    const isToken0 = token0.toLowerCase() === tokenAddress.toLowerCase();
    const targetAddress = isToken0 ? token0 : token1;

    const targetContract = new ethers.Contract(targetAddress, ERC20_ABI, provider);
    const [decimals, totalSupplyRaw] = await Promise.all([
      targetContract.decimals(),
      targetContract.totalSupply().catch(() => null),
    ]);
    const supplyHuman = totalSupplyRaw ? parseFloat(ethers.formatUnits(totalSupplyRaw, decimals)) : null;

    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 3000);

    const filter = pair.filters.Swap();
    const logs = await pair.queryFilter(filter, fromBlock, latestBlock);

    let buyCount = 0, sellCount = 0, buyVolumeUsd = 0, sellVolumeUsd = 0;

    const allParsed = logs.map((log: any) => {
      const { amount0In, amount1In, amount0Out, amount1Out } = log.args;
      const isBuy = isToken0 ? amount0Out > 0n : amount1Out > 0n;
      const rawAmount = isToken0
        ? (amount0Out > 0n ? amount0Out : amount0In)
        : (amount1Out > 0n ? amount1Out : amount1In);
      const amount = parseFloat(ethers.formatUnits(rawAmount, decimals));
      const usdValue = amount * price;

      if (isBuy) { buyCount++; buyVolumeUsd += usdValue; }
      else { sellCount++; sellVolumeUsd += usdValue; }

      return { log, isBuy, usdValue };
    });

    const totalVolume = buyVolumeUsd + sellVolumeUsd;
    const buyPressure = totalVolume > 0 ? (buyVolumeUsd / totalVolume) * 100 : 50;

    let filtered = allParsed;
    if (sideFilter === "buy") filtered = filtered.filter(t => t.isBuy);
    if (sideFilter === "sell") filtered = filtered.filter(t => !t.isBuy);
    if (minSize > 0) filtered = filtered.filter(t => t.usdValue >= minSize);

    const recent = filtered.slice(-30).reverse();

    const results = await Promise.all(
      recent.map(async ({ log, isBuy, usdValue }: any) => {
        const [block, tx] = await Promise.all([
          provider.getBlock(log.blockNumber),
          provider.getTransaction(log.transactionHash),
        ]);

        const walletAddr = (tx?.from || "0x0000000000000000000000000000000000000000").toLowerCase();

        if (walletFilter && walletAddr !== walletFilter) return null;

        const secondsAgo = Math.max(0, Math.floor(Date.now() / 1000) - (block?.timestamp || 0));
        const ago = secondsAgo < 60
          ? `${secondsAgo}s`
          : secondsAgo < 3600
          ? `${Math.floor(secondsAgo / 60)}m`
          : `${Math.floor(secondsAgo / 3600)}h`;

        const mcapUsd = supplyHuman !== null ? price * supplyHuman : null;

        return {
          type: isBuy ? "buy" : "sell",
          wallet: `${walletAddr.slice(0, 6)}…${walletAddr.slice(-4)}`,
          walletFull: walletAddr,
          amount: `$${usdValue >= 1000 ? (usdValue / 1000).toFixed(1) + "K" : usdValue.toFixed(0)}`,
          amountUsd: usdValue,
          mcap: mcapUsd !== null ? (mcapUsd >= 1_000_000 ? `$${(mcapUsd / 1_000_000).toFixed(2)}M` : `$${(mcapUsd / 1000).toFixed(1)}K`) : "N/A",
          ago,
          txHash: log.transactionHash,
        };
      })
    );

    return NextResponse.json({
      trades: results.filter(Boolean),
      stats: { buyCount, sellCount, buyVolumeUsd, sellVolumeUsd, buyPressure },
    });
  } catch (err) {
    console.error("Transaction fetch error:", err);
    return NextResponse.json({ trades: [], stats: null }, { status: 200 });
  }
}
