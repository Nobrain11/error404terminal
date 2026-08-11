// src/lib/dex/swapV2.ts
// ERROR404 Terminal — Uniswap V2-compatible buy/sell flow for Robinhood Chain
// Chain ID 4663 | Router02 + Factory verified against user-provided config (Aug 2026)

import { ethers, type Signer, type Provider } from "ethers";

// ─── Config ──────────────────────────────────────────────────────────────

export const ROBINHOOD_CHAIN_ID = 4663;

export const DEX_CONFIG = {
  factory: "0x8bcEaA40B9AcdfAedF85AdF4FF01F5Ad6517937f",
  router: "0x89e5DB8B5aA49aA85AC63f691524311AEB649eba",
} as const;

// ─── Minimal ABIs (only what we call) ───────────────────────────────────

const ROUTER_ABI = [
  "function WETH() external pure returns (address)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function swapExactETHForTokensSupportingFeeOnTransferTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable",
  "function swapExactTokensForETHSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
] as const;

const ERC20_ABI = [
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function balanceOf(address) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
] as const;

const PAIR_ABI = [
  "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
  "function token0() external view returns (address)",
] as const;

const FACTORY_ABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
] as const;

// ─── Errors ──────────────────────────────────────────────────────────────

export class SwapError extends Error {
  code:
    | "WRONG_NETWORK"
    | "NO_LIQUIDITY"
    | "INSUFFICIENT_BALANCE"
    | "INSUFFICIENT_GAS"
    | "USER_REJECTED"
    | "SLIPPAGE"
    | "UNKNOWN";
  constructor(code: SwapError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "SwapError";
  }
}

export function parseSwapError(err: unknown): SwapError {
  const msg = err instanceof Error ? err.message : String(err);

  if (/user rejected|user denied|ACTION_REJECTED/i.test(msg)) {
    return new SwapError("USER_REJECTED", "Transaction was rejected in your wallet.");
  }
  if (/insufficient funds/i.test(msg)) {
    return new SwapError("INSUFFICIENT_BALANCE", "Not enough ETH to cover this trade and gas.");
  }
  if (/INSUFFICIENT_OUTPUT_AMOUNT/i.test(msg)) {
    return new SwapError(
      "SLIPPAGE",
      "Price moved before your trade confirmed. Try increasing slippage tolerance or trading again."
    );
  }
  if (/INSUFFICIENT_LIQUIDITY|INSUFFICIENT_A_AMOUNT|INSUFFICIENT_B_AMOUNT/i.test(msg)) {
    return new SwapError("NO_LIQUIDITY", "Not enough liquidity in the pool for this trade size.");
  }
  return new SwapError("UNKNOWN", "Transaction failed. It may have been reverted by the router.");
}

// ─── Network guard ───────────────────────────────────────────────────────

export async function assertRobinhoodChain(provider: Provider) {
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== ROBINHOOD_CHAIN_ID) {
    throw new SwapError(
      "WRONG_NETWORK",
      `Connected to chain ${network.chainId}, expected Robinhood Chain (${ROBINHOOD_CHAIN_ID}).`
    );
  }
}

// ─── Slippage / deadline helpers ────────────────────────────────────────

export function applySlippage(amountOutWei: bigint, slippageBps: number): bigint {
  // slippageBps: 100 = 1%
  return (amountOutWei * BigInt(10000 - slippageBps)) / 10000n;
}

export function buildDeadline(minutesFromNow = 10): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + minutesFromNow * 60);
}

// ─── Balances ────────────────────────────────────────────────────────────

export async function getTokenBalance(
  provider: Provider,
  tokenAddress: string,
  owner: string
): Promise<{ raw: bigint; formatted: string; decimals: number; symbol: string }> {
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const [raw, decimals, symbol] = await Promise.all([
    token.balanceOf(owner) as Promise<bigint>,
    token.decimals() as Promise<number>,
    token.symbol() as Promise<string>,
  ]);
  return { raw, formatted: ethers.formatUnits(raw, decimals), decimals, symbol };
}

// ─── Buy quote ───────────────────────────────────────────────────────────

export interface BuyQuote {
  weth: string;
  amountInWei: bigint;
  amountOutWei: bigint;
  amountOutFormatted: string;
  tokenDecimals: number;
  tokenSymbol: string;
  priceImpactPct: number | null; // null if pair reserves unavailable -> show "DATA UNAVAILABLE"
}

export async function getBuyQuote(
  provider: Provider,
  tokenOut: string,
  amountInEth: string
): Promise<BuyQuote> {
  await assertRobinhoodChain(provider);

  const router = new ethers.Contract(DEX_CONFIG.router, ROUTER_ABI, provider);
  const factory = new ethers.Contract(DEX_CONFIG.factory, FACTORY_ABI, provider);
  const token = new ethers.Contract(tokenOut, ERC20_ABI, provider);

  const [weth, tokenDecimals, tokenSymbol] = await Promise.all([
    router.WETH() as Promise<string>,
    token.decimals() as Promise<number>,
    token.symbol() as Promise<string>,
  ]);

  const amountInWei = ethers.parseEther(amountInEth);
  const path = [weth, tokenOut];

  let amountOutWei: bigint;
  try {
    const amounts: bigint[] = await router.getAmountsOut(amountInWei, path);
    amountOutWei = amounts[amounts.length - 1];
  } catch {
    throw new SwapError(
      "NO_LIQUIDITY",
      "No route found for this token. There may be no liquidity pool on Robinhood Chain yet."
    );
  }

  if (amountOutWei === 0n) {
    throw new SwapError("NO_LIQUIDITY", "Quote returned zero output — check pool liquidity.");
  }

  // Best-effort price impact using pair reserves (not guaranteed available)
  let priceImpactPct: number | null = null;
  try {
    const pairAddr: string = await factory.getPair(weth, tokenOut);
    if (pairAddr !== ethers.ZeroAddress) {
      const pair = new ethers.Contract(pairAddr, PAIR_ABI, provider);
      const [reserve0, reserve1]: [bigint, bigint, number] = await pair.getReserves();
      const token0: string = await pair.token0();
      const [reserveIn, reserveOut] =
        token0.toLowerCase() === weth.toLowerCase()
          ? [reserve0, reserve1]
          : [reserve1, reserve0];

      if (reserveIn > 0n && reserveOut > 0n) {
        const spotOut = (amountInWei * reserveOut) / reserveIn;
        const impact = Number(((spotOut - amountOutWei) * 10000n) / spotOut) / 100;
        priceImpactPct = Math.max(0, impact);
      }
    }
  } catch {
    priceImpactPct = null; // DATA UNAVAILABLE in the UI, not fabricated
  }

  return {
    weth,
    amountInWei,
    amountOutWei,
    amountOutFormatted: ethers.formatUnits(amountOutWei, tokenDecimals),
    tokenDecimals,
    tokenSymbol,
    priceImpactPct,
  };
}

// ─── Sell quote ──────────────────────────────────────────────────────────

export interface SellQuote {
  weth: string;
  amountInWei: bigint; // token units, not ETH
  amountOutWei: bigint; // ETH out
  amountOutFormatted: string;
  tokenDecimals: number;
  tokenSymbol: string;
}

export async function getSellQuote(
  provider: Provider,
  tokenIn: string,
  amountInTokenUnits: bigint // raw token wei (e.g. from a % of balance)
): Promise<SellQuote> {
  await assertRobinhoodChain(provider);

  const router = new ethers.Contract(DEX_CONFIG.router, ROUTER_ABI, provider);
  const token = new ethers.Contract(tokenIn, ERC20_ABI, provider);
  const [weth, tokenDecimals, tokenSymbol] = await Promise.all([
    router.WETH() as Promise<string>,
    token.decimals() as Promise<number>,
    token.symbol() as Promise<string>,
  ]);

  const path = [tokenIn, weth];
  let amountOutWei: bigint;
  try {
    const amounts: bigint[] = await router.getAmountsOut(amountInTokenUnits, path);
    amountOutWei = amounts[amounts.length - 1];
  } catch {
    throw new SwapError("NO_LIQUIDITY", "No route found — pool may lack liquidity.");
  }

  return {
    weth,
    amountInWei: amountInTokenUnits,
    amountOutWei,
    amountOutFormatted: ethers.formatEther(amountOutWei),
    tokenDecimals,
    tokenSymbol,
  };
}

// ─── Approval ────────────────────────────────────────────────────────────

export async function ensureAllowance(
  signer: Signer,
  tokenAddress: string,
  amountWei: bigint
): Promise<{ hash: string; wait: () => Promise<ethers.TransactionReceipt | null> } | null> {
  const owner = await signer.getAddress();
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const current: bigint = await token.allowance(owner, DEX_CONFIG.router);
  if (current >= amountWei) return null; // already approved

  try {
    const tx = await token.approve(DEX_CONFIG.router, amountWei);
    return { hash: tx.hash, wait: () => tx.wait() };
  } catch (err) {
    throw parseSwapError(err);
  }
}

// ─── Execute buy ─────────────────────────────────────────────────────────

export interface ExecuteBuyParams {
  signer: Signer;
  tokenOut: string;
  amountInEth: string;
  slippageBps: number; // 100 = 1%
  recipient?: string; // defaults to signer address
}

export interface ExecuteBuyResult {
  hash: string;
  wait: () => Promise<ethers.TransactionReceipt | null>;
}

export async function executeBuy({
  signer,
  tokenOut,
  amountInEth,
  slippageBps,
  recipient,
}: ExecuteBuyParams): Promise<ExecuteBuyResult> {
  const provider = signer.provider;
  if (!provider) throw new SwapError("UNKNOWN", "Signer has no provider attached.");
  await assertRobinhoodChain(provider);

  const from = recipient ?? (await signer.getAddress());
  const quote = await getBuyQuote(provider, tokenOut, amountInEth);
  const amountOutMin = applySlippage(quote.amountOutWei, slippageBps);
  const deadline = buildDeadline();
  const path = [quote.weth, tokenOut];

  const router = new ethers.Contract(DEX_CONFIG.router, ROUTER_ABI, signer);

  const ethBalance = await provider.getBalance(from);
  if (ethBalance < quote.amountInWei) {
    throw new SwapError("INSUFFICIENT_BALANCE", "Not enough ETH to cover this trade.");
  }

  let gasEstimate: bigint;
  try {
    gasEstimate = await router.swapExactETHForTokensSupportingFeeOnTransferTokens.estimateGas(
      amountOutMin,
      path,
      from,
      deadline,
      { value: quote.amountInWei }
    );
  } catch (err) {
    throw parseSwapError(err);
  }

  const feeData = await provider.getFeeData();
  const gasCost = gasEstimate * (feeData.gasPrice ?? 0n);
  if (ethBalance < quote.amountInWei + gasCost) {
    throw new SwapError(
      "INSUFFICIENT_GAS",
      "You have enough ETH for the trade but not enough left over to cover gas."
    );
  }

  try {
    const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
      amountOutMin,
      path,
      from,
      deadline,
      { value: quote.amountInWei, gasLimit: (gasEstimate * 120n) / 100n } // 20% buffer
    );
    return { hash: tx.hash, wait: () => tx.wait() };
  } catch (err) {
    throw parseSwapError(err);
  }
}

// ─── Execute sell ────────────────────────────────────────────────────────

export interface ExecuteSellParams {
  signer: Signer;
  tokenIn: string;
  amountInTokenUnits: bigint; // raw token wei
  slippageBps: number;
  recipient?: string;
}

export async function executeSell({
  signer,
  tokenIn,
  amountInTokenUnits,
  slippageBps,
  recipient,
}: ExecuteSellParams): Promise<ExecuteBuyResult> {
  const provider = signer.provider;
  if (!provider) throw new SwapError("UNKNOWN", "Signer has no provider attached.");
  await assertRobinhoodChain(provider);

  const from = recipient ?? (await signer.getAddress());

  const balance = await getTokenBalance(provider, tokenIn, from);
  if (balance.raw < amountInTokenUnits) {
    throw new SwapError("INSUFFICIENT_BALANCE", "Not enough token balance to sell that amount.");
  }

  // Approval must be confirmed BEFORE calling this — call ensureAllowance()
  // as its own UI step first.
  const token = new ethers.Contract(tokenIn, ERC20_ABI, provider);
  const allowance: bigint = await token.allowance(from, DEX_CONFIG.router);
  if (allowance < amountInTokenUnits) {
    throw new SwapError(
      "UNKNOWN",
      "Token approval required before selling. Call ensureAllowance() first."
    );
  }

  const quote = await getSellQuote(provider, tokenIn, amountInTokenUnits);
  const amountOutMin = applySlippage(quote.amountOutWei, slippageBps);
  const deadline = buildDeadline();
  const path = [tokenIn, quote.weth];

  const router = new ethers.Contract(DEX_CONFIG.router, ROUTER_ABI, signer);

  let gasEstimate: bigint;
  try {
    gasEstimate = await router.swapExactTokensForETHSupportingFeeOnTransferTokens.estimateGas(
      amountInTokenUnits,
      amountOutMin,
      path,
      from,
      deadline
    );
  } catch (err) {
    throw parseSwapError(err);
  }

  const ethBalance = await provider.getBalance(from);
  const feeData = await provider.getFeeData();
  const gasCost = gasEstimate * (feeData.gasPrice ?? 0n);
  if (ethBalance < gasCost) {
    throw new SwapError("INSUFFICIENT_GAS", "Not enough ETH left to cover gas for this sell.");
  }

  try {
    const tx = await router.swapExactTokensForETHSupportingFeeOnTransferTokens(
      amountInTokenUnits,
      amountOutMin,
      path,
      from,
      deadline,
      { gasLimit: (gasEstimate * 120n) / 100n }
    );
    return { hash: tx.hash, wait: () => tx.wait() };
  } catch (err) {
    throw parseSwapError(err);
  }
}
