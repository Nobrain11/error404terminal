// ── Append to src/lib/dex/swapV2.ts ──

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
  amountInTokenUnits: bigint // pass raw token wei (e.g. from a % of balance)
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

  // Balance check
  const balance = await getTokenBalance(provider, tokenIn, from);
  if (balance.raw < amountInTokenUnits) {
    throw new SwapError("INSUFFICIENT_BALANCE", "Not enough token balance to sell that amount.");
  }

  // Approval must be confirmed BEFORE the swap — caller should await ensureAllowance()
  // separately (and show it as its own step in the UI) before calling executeSell.
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
