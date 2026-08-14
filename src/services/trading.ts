import { ethers } from "ethers";

// ── Robinhood Chain Config ──────────────────────────────────────────────────

export const CHAIN_ID = 4663;
export const RPC = "https://rpc.mainnet.chain.robinhood.com";

export const WETH =
  "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";

export const BAGS_FACTORY =
  "0xe8Cc4431adF8b5A847C113EF0c6af9043219Cb37";

export const BAGS_LENS =
  "0xC82Db941dAf90B754aecb5F7D14c683dc608d595";

export const BAGS_V4_HOOK =
  "0x2380aBf72C17aABAb76480244759AC7E2932EEcC";

export const UNIVERSAL_ROUTER =
  "0x8876789976dEcBfCbBbe364623C63652db8C0904";

export const V4_QUOTER =
  "0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94";

export const POOL_MANAGER =
  "0x8366a39CC670B4001A1121B8F6A443A643e40951";

export const POSITION_MANAGER =
  "0x58daec3116aae6D93017bAAea7749052E8a04fA7";

export const PERMIT2 =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3";

export const MULTICALL3 =
  "0xcA11bde05977b3631167028862bE2a173976CA11";

export const EXPLORER =
  "https://robinhoodchain.blockscout.com";

// ── ABIs ───────────────────────────────────────────────────────────────────

const ERC20_ABI = [
  "function approve(address spender, uint amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint)",
  "function balanceOf(address account) external view returns (uint)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
];

const BONDING_CURVE_ABI = [
  "function buy(uint256 minTokensOut, address recipient) external payable returns (uint256)",
  "function sell(uint256 tokensIn, uint256 minEthOut, address recipient) external returns (uint256)",
  "function getBuyPrice(uint256 ethIn) external view returns (uint256 tokensOut, uint256 fee)",
  "function getSellPrice(uint256 tokensIn) external view returns (uint256 ethOut, uint256 fee)",
  "function migrated() external view returns (bool)",
  "function thresholdQuote() external view returns (uint256)",
  "function realQuoteReserves() external view returns (uint256)",
];

const LENS_ABI = [
  "function getTokenState(address token) external view returns (address curve, address feeShare, bytes32 poolId, bool migrated, uint256 realQuoteReserves, uint256 thresholdQuote, uint256 virtualQuoteReserves, uint256 virtualBaseReserves, uint256 totalSupply)",
];

const POOL_MANAGER_ABI = [
  "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
];

// ── Types ──────────────────────────────────────────────────────────────────

export interface TokenState {
  token: string;
  curve: string;
  feeShare: string;
  poolId: string;
  migrated: boolean;
  realQuoteReserves: bigint;
  thresholdQuote: bigint;
  virtualQuoteReserves: bigint;
  virtualBaseReserves: bigint;
  totalSupply: bigint;
}

export interface BuyQuote {
  tokensOut: string;
  tokensOutRaw: bigint;
  fee: string;
  feeRaw: bigint;
  migrated: boolean;
}

export interface SellQuote {
  ethOut: string;
  ethOutRaw: bigint;
  fee: string;
  feeRaw: bigint;
  migrated: boolean;
}

type V4BuyQuote = {
  tokensOut: bigint;
  fee: bigint;
};

type V4SellQuote = {
  ethOut: bigint;
  fee: bigint;
};

// ── Provider / Wallet ──────────────────────────────────────────────────────

export function getProvider() {
  return new ethers.JsonRpcProvider(RPC, CHAIN_ID);
}

export function getWallet(privateKey: string) {
  return new ethers.Wallet(
    privateKey,
    getProvider(),
  );
}

// ── Validation ─────────────────────────────────────────────────────────────

function validateAddress(
  address: string,
  name: string,
): string {
  try {
    return ethers.getAddress(address);
  } catch {
    throw new Error(`Invalid ${name} address`);
  }
}

function validateSlippage(
  slippagePct: number,
): void {
  if (
    !Number.isFinite(slippagePct) ||
    slippagePct < 0 ||
    slippagePct > 50
  ) {
    throw new Error(
      "Slippage must be between 0% and 50%",
    );
  }
}

function applySlippage(
  amount: bigint,
  slippagePct: number,
): bigint {
  validateSlippage(slippagePct);

  const bps = BigInt(
    Math.round(slippagePct * 100),
  );

  return (
    amount *
    (10_000n - bps)
  ) / 10_000n;
}

// ── Token State ────────────────────────────────────────────────────────────

export async function getTokenState(
  tokenAddress: string,
): Promise<TokenState | null> {
  try {
    const token = validateAddress(
      tokenAddress,
      "token",
    );

    const provider = getProvider();

    const lens = new ethers.Contract(
      BAGS_LENS,
      LENS_ABI,
      provider,
    );

    const state =
      await lens.getTokenState(token);

    return {
      token,
      curve: state.curve as string,
      feeShare: state.feeShare as string,
      poolId: state.poolId as string,
      migrated: Boolean(state.migrated),
      realQuoteReserves:
        BigInt(state.realQuoteReserves),
      thresholdQuote:
        BigInt(state.thresholdQuote),
      virtualQuoteReserves:
        BigInt(state.virtualQuoteReserves),
      virtualBaseReserves:
        BigInt(state.virtualBaseReserves),
      totalSupply:
        BigInt(state.totalSupply),
    };
  } catch {
    return null;
  }
}

// ── ETH Balance ────────────────────────────────────────────────────────────

export async function getEthBalance(
  address: string,
): Promise<string> {
  try {
    const walletAddress =
      validateAddress(
        address,
        "wallet",
      );

    const provider =
      getProvider();

    const balance =
      await provider.getBalance(
        walletAddress,
      );

    return ethers.formatEther(
      balance,
    );
  } catch {
    return "0";
  }
}

// ── ERC20 Balance ──────────────────────────────────────────────────────────

export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
): Promise<{
  raw: bigint;
  formatted: string;
  decimals: number;
}> {
  try {
    const token =
      validateAddress(
        tokenAddress,
        "token",
      );

    const wallet =
      validateAddress(
        walletAddress,
        "wallet",
      );

    const provider =
      getProvider();

    const contract =
      new ethers.Contract(
        token,
        ERC20_ABI,
        provider,
      );

    const [
      balance,
      decimals,
    ] = await Promise.all([
      contract.balanceOf(wallet),
      contract.decimals(),
    ]);

    const raw =
      BigInt(balance);

    const decimalCount =
      Number(decimals);

    return {
      raw,
      formatted:
        ethers.formatUnits(
          raw,
          decimalCount,
        ),
      decimals:
        decimalCount,
    };
  } catch {
    return {
      raw: 0n,
      formatted: "0",
      decimals: 18,
    };
  }
}

// ── Bonding Curve Buy Quote ────────────────────────────────────────────────

async function getBondingCurveBuyQuote(
  state: TokenState,
  amountIn: bigint,
): Promise<{
  tokensOut: bigint;
  fee: bigint;
}> {
  const provider =
    getProvider();

  const curve =
    new ethers.Contract(
      state.curve,
      BONDING_CURVE_ABI,
      provider,
    );

  const [
    tokensOut,
    fee,
  ] =
    await curve.getBuyPrice(
      amountIn,
    );

  return {
    tokensOut: BigInt(tokensOut),
    fee: BigInt(fee),
  };
}

// ── Bonding Curve Sell Quote ───────────────────────────────────────────────

async function getBondingCurveSellQuote(
  state: TokenState,
  amountIn: bigint,
): Promise<{
  ethOut: bigint;
  fee: bigint;
}> {
  const provider =
    getProvider();

  const curve =
    new ethers.Contract(
      state.curve,
      BONDING_CURVE_ABI,
      provider,
    );

  const [
    ethOut,
    fee,
  ] =
    await curve.getSellPrice(
      amountIn,
    );

  return {
    ethOut: BigInt(ethOut),
    fee: BigInt(fee),
  };
}

// ── V4 Buy Quote ───────────────────────────────────────────────────────────
//
// Intentionally fails closed.
// We do not fabricate a price for graduated tokens.

async function getV4BuyQuote(
  _state: TokenState,
  _amountIn: bigint,
): Promise<V4BuyQuote> {
  throw new Error(
    "Graduated-token V4 buy quotes are not enabled yet",
  );
}

// ── V4 Sell Quote ──────────────────────────────────────────────────────────

async function getV4SellQuote(
  _state: TokenState,
  _amountIn: bigint,
): Promise<V4SellQuote> {
  throw new Error(
    "Graduated-token V4 sell quotes are not enabled yet",
  );
}

// ── Public Buy Quote ───────────────────────────────────────────────────────

export async function getBuyQuote(
  tokenAddress: string,
  amountEth: string,
): Promise<BuyQuote | null> {
  try {
    const state =
      await getTokenState(
        tokenAddress,
      );

    if (!state) {
      return null;
    }

    const amountIn =
      ethers.parseEther(
        amountEth,
      );

    if (amountIn <= 0n) {
      throw new Error(
        "Amount must be greater than zero",
      );
    }

    if (!state.migrated) {
      const quote =
        await getBondingCurveBuyQuote(
          state,
          amountIn,
        );

      return {
        tokensOut:
          ethers.formatEther(
            quote.tokensOut,
          ),
        tokensOutRaw:
          quote.tokensOut,
        fee:
          ethers.formatEther(
            quote.fee,
          ),
        feeRaw:
          quote.fee,
        migrated: false,
      };
    }

    const quote: V4BuyQuote =
      await getV4BuyQuote(
        state,
        amountIn,
      );

    return {
      tokensOut:
        ethers.formatEther(
          quote.tokensOut,
        ),
      tokensOutRaw:
        quote.tokensOut,
      fee:
        ethers.formatEther(
          quote.fee,
        ),
      feeRaw:
        quote.fee,
      migrated: true,
    };
  } catch {
    return null;
  }
}

// ── Public Sell Quote ──────────────────────────────────────────────────────

export async function getSellQuote(
  tokenAddress: string,
  amountTokenWei: string,
): Promise<SellQuote | null> {
  try {
    const state =
      await getTokenState(
        tokenAddress,
      );

    if (!state) {
      return null;
    }

    const amountIn =
      BigInt(amountTokenWei);

    if (amountIn <= 0n) {
      throw new Error(
        "Amount must be greater than zero",
      );
    }

    if (!state.migrated) {
      const quote =
        await getBondingCurveSellQuote(
          state,
          amountIn,
        );

      return {
        ethOut:
          ethers.formatEther(
            quote.ethOut,
          ),
        ethOutRaw:
          quote.ethOut,
        fee:
          ethers.formatEther(
            quote.fee,
          ),
        feeRaw:
          quote.fee,
        migrated: false,
      };
    }

    const quote: V4SellQuote =
      await getV4SellQuote(
        state,
        amountIn,
      );

    return {
      ethOut:
        ethers.formatEther(
          quote.ethOut,
        ),
      ethOutRaw:
        quote.ethOut,
      fee:
        ethers.formatEther(
          quote.fee,
        ),
      feeRaw:
        quote.fee,
      migrated: true,
    };
  } catch {
    return null;
  }
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
}): Promise<{
  success: boolean;
  hash?: string;
  error?: string;
}> {
  try {
    validateSlippage(
      slippagePct,
    );

    const wallet =
      getWallet(privateKey);

    const state =
      await getTokenState(
        tokenAddress,
      );

    if (!state) {
      return {
        success: false,
        error:
          "Token not found on Robinhood Chain",
      };
    }

    const amountIn =
      ethers.parseEther(
        amountEth,
      );

    if (amountIn <= 0n) {
      return {
        success: false,
        error:
          "Amount must be greater than zero",
      };
    }

    // Phase 1: bonding curve
    if (!state.migrated) {
      const curve =
        new ethers.Contract(
          state.curve,
          BONDING_CURVE_ABI,
          wallet,
        );

      const [
        tokensOut,
      ] =
        await curve.getBuyPrice(
          amountIn,
        );

      const minTokensOut =
        applySlippage(
          BigInt(tokensOut),
          slippagePct,
        );

      const tx =
        await curve.buy(
          minTokensOut,
          wallet.address,
          {
            value: amountIn,
            gasLimit: 500_000n,
          },
        );

      const receipt =
        await tx.wait();

      return {
        success:
          receipt?.status === 1,
        hash:
          tx.hash,
      };
    }

    // Phase 2: V4
    return {
      success: false,
      error:
        "This token has graduated to Uniswap V4. Graduated-token execution is not enabled yet.",
    };
  } catch (err: any) {
    const message =
      err?.reason ||
      err?.shortMessage ||
      err?.message ||
      "Transaction failed";

    return {
      success: false,
      error: String(message),
    };
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
}): Promise<{
  success: boolean;
  hash?: string;
  error?: string;
}> {
  try {
    validateSlippage(
      slippagePct,
    );

    const wallet =
      getWallet(privateKey);

    const state =
      await getTokenState(
        tokenAddress,
      );

    if (!state) {
      return {
        success: false,
        error:
          "Token not found on Robinhood Chain",
      };
    }

    const amountIn =
      BigInt(amountTokenWei);

    if (amountIn <= 0n) {
      return {
        success: false,
        error:
          "Amount must be greater than zero",
      };
    }

    // Phase 1: bonding curve
    if (!state.migrated) {
      const curve =
        new ethers.Contract(
          state.curve,
          BONDING_CURVE_ABI,
          wallet,
        );

      const token =
        new ethers.Contract(
          tokenAddress,
          ERC20_ABI,
          wallet,
        );

      const allowance =
        BigInt(
          await token.allowance(
            wallet.address,
            state.curve,
          ),
        );

      if (
        allowance < amountIn
      ) {
        const approveTx =
          await token.approve(
            state.curve,
            ethers.MaxUint256,
          );

        await approveTx.wait();
      }

      const [
        ethOut,
      ] =
        await curve.getSellPrice(
          amountIn,
        );

      const minEthOut =
        applySlippage(
          BigInt(ethOut),
          slippagePct,
        );

      const tx =
        await curve.sell(
          amountIn,
          minEthOut,
          wallet.address,
          {
            gasLimit: 500_000n,
          },
        );

      const receipt =
        await tx.wait();

      return {
        success:
          receipt?.status === 1,
        hash:
          tx.hash,
      };
    }

    // Phase 2: V4
    return {
      success: false,
      error:
        "This token has graduated to Uniswap V4. Graduated-token execution is not enabled yet.",
    };
  } catch (err: any) {
    const message =
      err?.reason ||
      err?.shortMessage ||
      err?.message ||
      "Transaction failed";

    return {
      success: false,
      error: String(message),
    };
  }
}

// ── Gas Estimate ───────────────────────────────────────────────────────────

export async function estimateGas(): Promise<string> {
  try {
    const provider =
      getProvider();

    const feeData =
      await provider.getFeeData();

    const gasPrice =
      feeData.gasPrice ||
      0n;

    const estimated =
      gasPrice *
      300_000n;

    return ethers.formatEther(
      estimated,
    );
  } catch {
    return "~0.001";
  }
}

// ── V4 Deployment Information ──────────────────────────────────────────────

export function getV4Config() {
  return {
    universalRouter:
      UNIVERSAL_ROUTER,
    quoter:
      V4_QUOTER,
    poolManager:
      POOL_MANAGER,
    permit2:
      PERMIT2,
    hook:
      BAGS_V4_HOOK,
  };
}

// ── Pool State ─────────────────────────────────────────────────────────────

export async function getV4PoolState(
  poolId: string,
): Promise<{
  sqrtPriceX96: bigint;
  tick: number;
  protocolFee: number;
  lpFee: number;
} | null> {
  try {
    if (
      !/^0x[a-fA-F0-9]{64}$/.test(
        poolId,
      )
    ) {
      throw new Error(
        "Invalid pool ID",
      );
    }

    const provider =
      getProvider();

    const manager =
      new ethers.Contract(
        POOL_MANAGER,
        POOL_MANAGER_ABI,
        provider,
      );

    const result =
      await manager.getSlot0(
        poolId,
      );

    return {
      sqrtPriceX96:
        BigInt(
          result.sqrtPriceX96,
        ),
      tick:
        Number(result.tick),
      protocolFee:
        Number(
          result.protocolFee,
        ),
      lpFee:
        Number(result.lpFee),
    };
  } catch {
    return null;
  }
}

// ── Explorer ───────────────────────────────────────────────────────────────

export function getTransactionUrl(
  hash: string,
): string {
  return `${EXPLORER}/tx/${hash}`;
}
