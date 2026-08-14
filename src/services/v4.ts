import { ethers } from "ethers";

import {
  CHAIN_ID,
  EXPLORER,
  PERMIT2,
  POOL_MANAGER,
  UNIVERSAL_ROUTER,
  V4_QUOTER,
  WETH,
  type TokenState,
  getProvider,
} from "./trading";

// ─────────────────────────────────────────────────────────────────────────────
// Robinhood Chain — Uniswap V4
// ─────────────────────────────────────────────────────────────────────────────

export const V4_CHAIN_ID = CHAIN_ID;

export const V4_ADDRESSES = {
  universalRouter: UNIVERSAL_ROUTER,
  quoter: V4_QUOTER,
  poolManager: POOL_MANAGER,
  permit2: PERMIT2,
  weth: WETH,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface V4PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

export interface V4Quote {
  amountIn: bigint;
  amountOut: bigint;
  gasEstimate?: bigint;
  poolKey: V4PoolKey;
  zeroForOne: boolean;
  exactInput: boolean;
}

export interface V4Execution {
  to: string;
  data: string;
  value: bigint;
  gasLimit?: bigint;
  description: string;
}

export interface V4AdapterStatus {
  chainId: number;
  universalRouter: string;
  quoter: string;
  poolManager: string;
  permit2: string;
  enabled: boolean;
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ABIs
// ─────────────────────────────────────────────────────────────────────────────
//
// IMPORTANT:
//
// Robinhood Chain's deployed V4 router/quoter requires chain-specific command
// encoding. Do not replace this with a generic Uniswap V4 SDK encoding without
// validating it against the deployed Robinhood contracts.
//
// The contracts are therefore kept as address-level dependencies here until
// the exact deployed ABI/command format has been verified.
// ─────────────────────────────────────────────────────────────────────────────

const POOL_MANAGER_ABI = [
  "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
];

const ERC20_ABI = [
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
];

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ZERO_ADDRESS = ethers.ZeroAddress;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function checksum(address: string, name: string): string {
  if (!ADDRESS_RE.test(address)) {
    throw new Error(`Invalid ${name} address`);
  }

  return ethers.getAddress(address);
}

function ensurePositive(value: bigint, name: string): void {
  if (value <= 0n) {
    throw new Error(`${name} must be greater than zero`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract instances
// ─────────────────────────────────────────────────────────────────────────────

export function getPoolManagerContract(
  providerOrSigner:
    | ethers.Provider
    | ethers.Signer,
): ethers.Contract {
  return new ethers.Contract(
    checksum(POOL_MANAGER, "PoolManager"),
    POOL_MANAGER_ABI,
    providerOrSigner,
  );
}

export function getTokenContract(
  tokenAddress: string,
  providerOrSigner:
    | ethers.Provider
    | ethers.Signer,
): ethers.Contract {
  return new ethers.Contract(
    checksum(tokenAddress, "token"),
    ERC20_ABI,
    providerOrSigner,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Adapter status
// ─────────────────────────────────────────────────────────────────────────────

export function getV4AdapterStatus(): V4AdapterStatus {
  return {
    chainId: CHAIN_ID,
    universalRouter: checksum(
      UNIVERSAL_ROUTER,
      "UniversalRouter",
    ),
    quoter: checksum(
      V4_QUOTER,
      "V4Quoter",
    ),
    poolManager: checksum(
      POOL_MANAGER,
      "PoolManager",
    ),
    permit2: checksum(
      PERMIT2,
      "Permit2",
    ),
    enabled: false,
    reason:
      "Robinhood-specific V4 quote/router command encoding still requires live deployment verification.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Token currency ordering
// ─────────────────────────────────────────────────────────────────────────────
//
// Uniswap V4 PoolKey requires currencies to be sorted.
//
// Native ETH is represented by address(0).
// WETH remains the ERC20 currency when the pool is WETH-based.
// ─────────────────────────────────────────────────────────────────────────────

export function sortCurrencies(
  tokenA: string,
  tokenB: string,
): {
  currency0: string;
  currency1: string;
  zeroForOne: boolean;
} {
  const a = checksum(tokenA, "currency0");
  const b = checksum(tokenB, "currency1");

  if (a.toLowerCase() === b.toLowerCase()) {
    throw new Error("Pool currencies cannot be identical");
  }

  const aIsZero = a === ZERO_ADDRESS;
  const bIsZero = b === ZERO_ADDRESS;

  if (aIsZero) {
    return {
      currency0: ZERO_ADDRESS,
      currency1: b,
      zeroForOne: true,
    };
  }

  if (bIsZero) {
    return {
      currency0: ZERO_ADDRESS,
      currency1: a,
      zeroForOne: false,
    };
  }

  const aLower = a.toLowerCase();
  const bLower = b.toLowerCase();

  if (aLower < bLower) {
    return {
      currency0: a,
      currency1: b,
      zeroForOne: true,
    };
  }

  return {
    currency0: b,
    currency1: a,
    zeroForOne: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pool ID validation
// ─────────────────────────────────────────────────────────────────────────────

export function validatePoolId(
  poolId: string,
): string {
  if (
    typeof poolId !== "string" ||
    !/^0x[a-fA-F0-9]{64}$/.test(poolId)
  ) {
    throw new Error("Invalid V4 pool ID");
  }

  return poolId;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pool state
// ─────────────────────────────────────────────────────────────────────────────

export async function getPoolState(
  poolId: string,
): Promise<{
  sqrtPriceX96: bigint;
  tick: number;
  protocolFee: number;
  lpFee: number;
}> {
  const validPoolId = validatePoolId(poolId);

  const provider = getProvider();

  const manager = getPoolManagerContract(provider);

  const result = await manager.getSlot0(validPoolId);

  return {
    sqrtPriceX96: BigInt(result.sqrtPriceX96),
    tick: Number(result.tick),
    protocolFee: Number(result.protocolFee),
    lpFee: Number(result.lpFee),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build pool key
// ─────────────────────────────────────────────────────────────────────────────
//
// BagsLens gives us the poolId, but not enough information to safely infer
// every PoolKey field. The caller therefore has to provide the actual fee,
// tickSpacing and hooks once obtained from the verified pool configuration.
// ─────────────────────────────────────────────────────────────────────────────

export function buildPoolKey({
  token,
  fee,
  tickSpacing,
  hooks,
}: {
  token: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}): V4PoolKey {
  const tokenAddress = checksum(token, "token");
  const hooksAddress = checksum(hooks, "hooks");

  if (!Number.isInteger(fee) || fee < 0 || fee > 1_000_000) {
    throw new Error("Invalid V4 fee");
  }

  if (
    !Number.isInteger(tickSpacing) ||
    tickSpacing <= 0
  ) {
    throw new Error("Invalid V4 tick spacing");
  }

  const sorted = sortCurrencies(
    WETH,
    tokenAddress,
  );

  return {
    currency0: sorted.currency0,
    currency1: sorted.currency1,
    fee,
    tickSpacing,
    hooks: hooksAddress,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// V4 quote
// ─────────────────────────────────────────────────────────────────────────────
//
// DO NOT return a fabricated quote.
//
// This function intentionally throws until the exact Robinhood V4 Quoter
// calldata has been verified against the deployed contract.
//
// This is preferable to returning 0 or estimating from pool state because
// hooks and fees can materially change the execution result.
// ─────────────────────────────────────────────────────────────────────────────

export async function quoteExactInputSingle(params: {
  token: string;
  amountIn: bigint;
  poolKey: V4PoolKey;
  zeroForOne: boolean;
  sqrtPriceLimitX96?: bigint;
}): Promise<V4Quote> {
  ensurePositive(params.amountIn, "amountIn");

  checksum(params.token, "token");

  if (
    params.sqrtPriceLimitX96 !== undefined &&
    params.sqrtPriceLimitX96 < 0n
  ) {
    throw new Error("Invalid sqrtPriceLimitX96");
  }

  validatePoolKey(params.poolKey);

  throw new Error(
    `Robinhood V4 exact-input quote adapter is disabled until the deployed V4Quoter encoding is verified at ${V4_QUOTER}.`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Buy quote
// ─────────────────────────────────────────────────────────────────────────────

export async function quoteBuy(
  state: TokenState,
  amountEth: bigint,
): Promise<V4Quote> {
  ensurePositive(amountEth, "amountEth");

  if (!state.migrated) {
    throw new Error(
      "quoteBuyV4 called for a token that has not graduated",
    );
  }

  validatePoolId(state.poolId);

  return quoteExactInputSingle({
    token: state.token,
    amountIn: amountEth,
    poolKey: {
      currency0: WETH,
      currency1: checksum(state.token, "token"),
      fee: 0,
      tickSpacing: 0,
      hooks: ZERO_ADDRESS,
    },
    zeroForOne: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sell quote
// ─────────────────────────────────────────────────────────────────────────────

export async function quoteSell(
  state: TokenState,
  amountToken: bigint,
): Promise<V4Quote> {
  ensurePositive(amountToken, "amountToken");

  if (!state.migrated) {
    throw new Error(
      "quoteSellV4 called for a token that has not graduated",
    );
  }

  validatePoolId(state.poolId);

  return quoteExactInputSingle({
    token: state.token,
    amountIn: amountToken,
    poolKey: {
      currency0: WETH,
      currency1: checksum(state.token, "token"),
      fee: 0,
      tickSpacing: 0,
      hooks: ZERO_ADDRESS,
    },
    zeroForOne: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Permit2 allowance
// ─────────────────────────────────────────────────────────────────────────────

export async function getPermit2Allowance(
  tokenAddress: string,
  owner: string,
): Promise<bigint> {
  const token = getTokenContract(
    tokenAddress,
    getProvider(),
  );

  const spender = checksum(
    PERMIT2,
    "Permit2",
  );

  const ownerAddress = checksum(
    owner,
    "owner",
  );

  return BigInt(
    await token.allowance(
      ownerAddress,
      spender,
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ERC20 → Permit2 approval
// ─────────────────────────────────────────────────────────────────────────────
//
// This only approves the ERC20 token to Permit2.
// It does NOT grant UniversalRouter arbitrary token access.
// Permit2's own allowance mechanism must subsequently be configured.
// ─────────────────────────────────────────────────────────────────────────────

export async function approveTokenForPermit2(
  signer: ethers.Signer,
  tokenAddress: string,
  amount: bigint,
): Promise<ethers.TransactionResponse> {
  ensurePositive(amount, "approval amount");

  const token = getTokenContract(
    tokenAddress,
    signer,
  );

  const permit2 = checksum(
    PERMIT2,
    "Permit2",
  );

  return token.approve(
    permit2,
    amount,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Execution builder
// ─────────────────────────────────────────────────────────────────────────────
//
// Deliberately disabled until the exact Robinhood-specific command format
// has been verified.
//
// Returning an execution object with fabricated calldata would be unsafe.
// ─────────────────────────────────────────────────────────────────────────────

export function buildExactInputExecution(_params: {
  poolKey: V4PoolKey;
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: string;
  zeroForOne: boolean;
  deadline: bigint;
}): V4Execution {
  throw new Error(
    "Robinhood V4 UniversalRouter execution encoding is not enabled. Exact deployed command encoding must be verified before enabling live swaps.",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function validatePoolKey(
  poolKey: V4PoolKey,
): void {
  checksum(poolKey.currency0, "currency0");
  checksum(poolKey.currency1, "currency1");
  checksum(poolKey.hooks, "hooks");

  if (
    poolKey.currency0.toLowerCase() >=
    poolKey.currency1.toLowerCase()
  ) {
    throw new Error(
      "V4 PoolKey currencies are not sorted",
    );
  }

  if (
    !Number.isInteger(poolKey.fee) ||
    poolKey.fee < 0 ||
    poolKey.fee > 1_000_000
  ) {
    throw new Error("Invalid V4 pool fee");
  }

  if (
    !Number.isInteger(poolKey.tickSpacing) ||
    poolKey.tickSpacing <= 0
  ) {
    throw new Error("Invalid V4 tick spacing");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Safety helpers
// ─────────────────────────────────────────────────────────────────────────────

export function calculateMinimumAmountOut(
  quotedAmount: bigint,
  slippagePct: number,
): bigint {
  ensurePositive(
    quotedAmount,
    "quoted amount",
  );

  if (
    !Number.isFinite(slippagePct) ||
    slippagePct < 0 ||
    slippagePct > 50
  ) {
    throw new Error(
      "Slippage must be between 0% and 50%",
    );
  }

  const slippageBps = BigInt(
    Math.round(slippagePct * 100),
  );

  return (
    quotedAmount *
    (10_000n - slippageBps)
  ) /
    10_000n;
}

export function getDeadline(
  secondsFromNow = 60,
): bigint {
  if (
    !Number.isInteger(secondsFromNow) ||
    secondsFromNow < 10 ||
    secondsFromNow > 3_600
  ) {
    throw new Error(
      "Deadline must be between 10 and 3600 seconds",
    );
  }

  return (
    BigInt(
      Math.floor(Date.now() / 1_000),
    ) +
    BigInt(secondsFromNow)
  );
}

export function isV4AddressSet(): boolean {
  return (
    ADDRESS_RE.test(UNIVERSAL_ROUTER) &&
    ADDRESS_RE.test(V4_QUOTER) &&
    ADDRESS_RE.test(POOL_MANAGER) &&
    ADDRESS_RE.test(PERMIT2)
  );
}

export function getExplorerTxUrl(
  txHash: string,
): string {
  return `${EXPLORER}/tx/${txHash}`;
}
