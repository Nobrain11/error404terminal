import { ethers } from "ethers";

// ── Robinhood Chain Config ─────────────────────────────────────────────────
export const CHAIN_ID = 4663;
export const RPC = "https://rpc.mainnet.chain.robinhood.com";
export const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";
export const BAGS_FACTORY = "0xe8Cc4431adF8b5A847C113EF0c6af9043219Cb37";
export const BAGS_LENS = "0xC82Db941dAf90B754aecb5F7D14c683dc608d595";
export const UNIVERSAL_ROUTER = "0x8876789976dEcBfCbBbe364623C63652db8C0904";
export const POOL_MANAGER = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
export const EXPLORER = "https://robinhoodchain.blockscout.com";

// ── ABIs ───────────────────────────────────────────────────────────────────
const ERC20_ABI = [
  "function approve(address spender, uint amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint)",
  "function balanceOf(address account) external view returns (uint)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
];

// BagsBondingCurve ABI — for pre-graduation tokens
const BONDING_CURVE_ABI = [
  "function buy(uint256 minTokensOut, address recipient) external payable returns (uint256 tokensOut)",
  "function sell(uint256 tokensIn, uint256 minEthOut, address recipient) external returns (uint256 ethOut)",
  "function getBuyPrice(uint256 ethIn) external view returns (uint256 tokensOut, uint256 fee)",
  "function getSellPrice(uint256 tokensIn) external view returns (uint256 ethOut, uint256 fee)",
  "function migrated() external view returns (bool)",
  "function thresholdQuote() external view returns (uint256)",
  "function realQuoteReserves() external view returns (uint256)",
];

// BagsFactory ABI
const FACTORY_ABI = [
  "function curveForToken(address token) external view returns (address)",
  "function feeShareForToken(address token) external view returns (address)",
];

// BagsLens ABI
const LENS_ABI = [
  "function getTokenState(address token) external view returns (address curve, address feeShare, bytes32 poolId, bool migrated, uint256 realQuoteReserves, uint256 thresholdQuote, uint256 virtualQuoteReserves, uint256 virtualBaseReserves, uint256 totalSupply)",
];

// ── Provider / Wallet ──────────────────────────────────────────────────────
export function getProvider() {
  return new ethers.JsonRpcProvider(RPC, CHAIN_ID);
}

export function getWallet(privateKey: string) {
  return new ethers.Wallet(privateKey, getProvider());
}

// ── Token State ────────────────────────────────────────────────────────────
export async function getTokenState(tokenAddress: string) {
  try {
    const provider = getProvider();
    const lens = new ethers.Contract(BAGS_LENS, LENS_ABI, provider);
    const state = await lens.getTokenState(tokenAddress);
    return {
      curve: state.curve as string,
      feeShare: state.feeShare as string,
      poolId: state.poolId as string,
      migrated: state.migrated as boolean,
      realQuoteReserves: state.realQuoteReserves as bigint,
      thresholdQuote: state.thresholdQuote as bigint,
    };
  } catch {
    return null;
  }
}

// ── Balances ───────────────────────────────────────────────────────────────
export async function getEthBalance(address: string): Promise<string> {
  try {
    const provider = getProvider();
    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  } catch { return "0"; }
}

export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<{ raw: bigint; formatted: string; decimals: number }> {
  try {
    const provider = getProvider();
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    const [balance, decimals] = await Promise.all([
      token.balanceOf(walletAddress),
      token.decimals(),
    ]);
    return {
      raw: balance as bigint,
      formatted: ethers.formatUnits(balance, decimals),
      decimals: Number(decimals),
    };
  } catch {
    return { raw: 0n, formatted: "0", decimals: 18 };
  }
}

// ── Buy Quote ──────────────────────────────────────────────────────────────
export async function getBuyQuote(
  tokenAddress: string,
  amountEth: string
): Promise<{ tokensOut: string; fee: string; migrated: boolean } | null> {
  try {
    const state = await getTokenState(tokenAddress);
    if (!state) return null;

    if (!state.migrated) {
      // Bonding curve quote
      const provider = getProvider();
      const curve = new ethers.Contract(state.curve, BONDING_CURVE_ABI, provider);
      const amountIn = ethers.parseEther(amountEth);
      const [tokensOut, fee] = await curve.getBuyPrice(amountIn);
      return {
        tokensOut: ethers.formatEther(tokensOut),
        fee: ethers.formatEther(fee),
        migrated: false,
      };
    }

    // Graduated — Uniswap V4 (simplified estimate)
    return {
      tokensOut: "0",
      fee: "0",
      migrated: true,
    };
  } catch { return null; }
}

// ── Buy Token ──────────────────────────────────────────────────────────────
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
    const state = await getTokenState(tokenAddress);

    if (!state) {
      return { success: false, error: "Token not found on Robinhood Chain" };
    }

    const amountIn = ethers.parseEther(amountEth);

    if (!state.migrated) {
      // Phase 1 — Bonding curve buy
      const curve = new ethers.Contract(state.curve, BONDING_CURVE_ABI, wallet);

      // Get quote for min tokens out with slippage
      const [tokensOut] = await curve.getBuyPrice(amountIn);
      const minTokensOut = tokensOut * BigInt(Math.floor((1 - slippagePct / 100) * 10000)) / 10000n;

      const tx = await curve.buy(minTokensOut, wallet.address, {
        value: amountIn,
        gasLimit: 500000n,
      });

      const receipt = await tx.wait();
      return {
        success: receipt?.status === 1,
        hash: tx.hash,
      };
    } else {
      // Phase 2 — Graduated, use UniversalRouter
      // NOTE: Robinhood Chain's UniversalRouter has a modified struct
      // For now return an informative error until we implement the full encoding
      return {
        success: false,
        error: "This token has graduated to Uniswap V4. Use app.uniswap.org with Robinhood Chain (ID: 4663) to trade it.",
      };
    }
  } catch (err: any) {
    const msg = err?.reason || err?.shortMessage || err?.message || "Transaction failed";
    return { success: false, error: msg };
  }
}

// ── Sell Token ─────────────────────────────────────────────────────────────
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
    const state = await getTokenState(tokenAddress);

    if (!state) {
      return { success: false, error: "Token not found on Robinhood Chain" };
    }

    const amountIn = BigInt(amountTokenWei);

    if (!state.migrated) {
      // Phase 1 — Bonding curve sell
      const curve = new ethers.Contract(state.curve, BONDING_CURVE_ABI, wallet);
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

      // Approve curve to spend tokens
      const allowance = await token.allowance(wallet.address, state.curve);
      if (allowance < amountIn) {
        const approveTx = await token.approve(state.curve, ethers.MaxUint256);
        await approveTx.wait();
      }

      // Get quote for min ETH out with slippage
      const [ethOut] = await curve.getSellPrice(amountIn);
      const minEthOut = ethOut * BigInt(Math.floor((1 - slippagePct / 100) * 10000)) / 10000n;

      const tx = await curve.sell(amountIn, minEthOut, wallet.address, {
        gasLimit: 500000n,
      });

      const receipt = await tx.wait();
      return {
        success: receipt?.status === 1,
        hash: tx.hash,
      };
    } else {
      return {
        success: false,
        error: "This token has graduated to Uniswap V4. Use app.uniswap.org with Robinhood Chain (ID: 4663) to trade it.",
      };
    }
  } catch (err: any) {
    const msg = err?.reason || err?.shortMessage || err?.message || "Transaction failed";
    return { success: false, error: msg };
  }
}

// ── Gas Estimate ───────────────────────────────────────────────────────────
export async function estimateGas(): Promise<string> {
  try {
    const provider = getProvider();
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || 0n;
    // ~300K gas for a curve buy
    const estimated = gasPrice * 300000n;
    return ethers.formatEther(estimated);
  } catch { return "~0.001"; }
}
