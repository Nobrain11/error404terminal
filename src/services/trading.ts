import { ethers } from "ethers";

const RPC = "https://robinhood-rpc.publicnode.com";

// Uniswap V2 Router ABI — minimal for swaps
const ROUTER_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function WETH() external pure returns (address)",
];

const ERC20_ABI = [
  "function approve(address spender, uint amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint)",
  "function balanceOf(address account) external view returns (uint)",
  "function decimals() external view returns (uint8)",
];

// NOTE: Replace with actual Robinhood Chain Uniswap V2 router when confirmed
// This is the standard Uniswap V2 router — needs verification for Robinhood Chain
const ROUTER_ADDRESS = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24"; // Uniswap V2 on most chains

export async function getProvider() {
  return new ethers.JsonRpcProvider(RPC);
}

export function getWallet(privateKey: string) {
  const provider = new ethers.JsonRpcProvider(RPC);
  return new ethers.Wallet(privateKey, provider);
}

export async function getEthBalance(address: string): Promise<string> {
  try {
    const provider = await getProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch { return "0"; }
}

export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<{ raw: bigint; formatted: string; decimals: number }> {
  try {
    const provider = await getProvider();
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const [balance, decimals] = await Promise.all([
      token.balanceOf(walletAddress),
      token.decimals(),
    ]);
    return {
      raw: balance,
      formatted: ethers.formatUnits(balance, decimals),
      decimals: Number(decimals),
    };
  } catch {
    return { raw: 0n, formatted: "0", decimals: 18 };
  }
}

export async function getQuote(
  tokenAddress: string,
  amountEth: string
): Promise<{ tokenAmount: string; priceImpact: number } | null> {
  try {
    const provider = await getProvider();
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, provider);
    const weth = await router.WETH();
    const amountIn = ethers.parseEther(amountEth);
    const amounts = await router.getAmountsOut(amountIn, [weth, tokenAddress]);
    return {
      tokenAmount: amounts[1].toString(),
      priceImpact: 0, // would need reserves to calculate accurately
    };
  } catch { return null; }
}

export async function buyToken({
  privateKey,
  tokenAddress,
  amountEth,
  slippagePct = 0.5,
}: {
  privateKey: string;
  tokenAddress: string;
  amountEth: string;
  slippagePct?: number;
}): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const wallet = getWallet(privateKey);
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
    const weth = await router.WETH();

    const amountIn = ethers.parseEther(amountEth);
    const amounts = await router.getAmountsOut(amountIn, [weth, tokenAddress]);
    const amountOutMin = amounts[1] * BigInt(Math.floor((1 - slippagePct / 100) * 1000)) / 1000n;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const tx = await router.swapExactETHForTokens(
      amountOutMin,
      [weth, tokenAddress],
      wallet.address,
      deadline,
      { value: amountIn }
    );

    const receipt = await tx.wait();
    return {
      success: receipt?.status === 1,
      hash: tx.hash,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.reason || err?.message || "Transaction failed",
    };
  }
}

export async function sellToken({
  privateKey,
  tokenAddress,
  amountTokenWei,
  slippagePct = 0.5,
}: {
  privateKey: string;
  tokenAddress: string;
  amountTokenWei: string;
  slippagePct?: number;
}): Promise<{ success: boolean; hash?: string; error?: string }> {
  try {
    const wallet = getWallet(privateKey);
    const provider = await getProvider();

    // Approve first
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const allowance = await token.allowance(wallet.address, ROUTER_ADDRESS);
    const amount = BigInt(amountTokenWei);

    if (allowance < amount) {
      const approveTx = await token.approve(ROUTER_ADDRESS, ethers.MaxUint256);
      await approveTx.wait();
    }

    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, wallet);
    const weth = await router.WETH();

    const amounts = await router.getAmountsOut(amount, [tokenAddress, weth]);
    const amountOutMin = amounts[1] * BigInt(Math.floor((1 - slippagePct / 100) * 1000)) / 1000n;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const tx = await router.swapExactTokensForETH(
      amount,
      amountOutMin,
      [tokenAddress, weth],
      wallet.address,
      deadline,
    );

    const receipt = await tx.wait();
    return {
      success: receipt?.status === 1,
      hash: tx.hash,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.reason || err?.message || "Transaction failed",
    };
  }
}

export async function estimateGas(to: string, value: string): Promise<string> {
  try {
    const provider = await getProvider();
    const estimate = await provider.estimateGas({
      to,
      value: ethers.parseEther(value),
    });
    const feeData = await provider.getFeeData();
    const total = estimate * (feeData.gasPrice ?? 0n);
    return ethers.formatEther(total);
  } catch { return "0"; }
}
