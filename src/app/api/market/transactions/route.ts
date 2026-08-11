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
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pairAddress = searchParams.get("pairAddress");
  const tokenAddress = searchParams.get("ca");
  const price = parseFloat(searchParams.get("price") || "0");

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
    const decimals = await targetContract.decimals();

    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 3000);

    const filter = pair.filters.Swap();
    const logs = await pair.queryFilter(filter, fromBlock, latestBlock);

    const recent = logs.slice(-15).reverse();

    const results = await Promise.all(
      recent.map(async (log: any) => {
        const { amount0In, amount1In, amount0Out, amount1Out } = log.args;

        const isBuy = isToken0 ? amount0Out > 0n : amount1Out > 0n;
        const rawAmount = isToken0
          ? (amount0Out > 0n ? amount0Out : amount0In)
          : (amount1Out > 0n ? amount1Out : amount1In);

        const amount = parseFloat(ethers.formatUnits(rawAmount, decimals));
        const usdValue = amount * price;

        const [block, tx] = await Promise.all([
          provider.getBlock(log.blockNumber),
          provider.getTransaction(log.transactionHash),
        ]);

        const secondsAgo = Math.max(0, Math.floor(Date.now() / 1000) - (block?.timestamp || 0));
        const ago = secondsAgo < 60
          ? `${secondsAgo}s`
          : secondsAgo < 3600
          ? `${Math.floor(secondsAgo / 60)}m`
          : `${Math.floor(secondsAgo / 3600)}h`;

        const wallet = tx?.from || "0x0000…0000";

        return {
          type: isBuy ? "buy" : "sell",
          wallet: `${wallet.slice(0, 4)}…${wallet.slice(-3)}`,
          amount: `$${usdValue >= 1000 ? (usdValue / 1000).toFixed(1) + "K" : usdValue.toFixed(0)}`,
          ago,
        };
      })
    );

    return NextResponse.json(results);
  } catch (err) {
    console.error("Transaction fetch error:", err);
    return NextResponse.json([], { status: 200 });
  }
}
