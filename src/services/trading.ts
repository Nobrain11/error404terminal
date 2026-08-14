import { ethers } from "ethers";

// ── Robinhood Chain Config ──────────────────────────────────────────────────
export const CHAIN_ID = 4663;
export const RPC = "https://rpc.mainnet.chain.robinhood.com";
export const BACKUP_RPC = "https://robinhood-rpc.publicnode.com";

export const WETH = "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73";
export const BAGS_FACTORY = "0xe8Cc4431adF8b5A847C113EF0c6af9043219Cb37";
export const BAGS_LENS = "0xC82Db941dAf90B754aecb5F7D14c683dc608d595";
export const UNIVERSAL_ROUTER = "0x8876789976dEcBfCbBbe364623C63652db8C0904";
export const V4_QUOTER = "0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94";
export const POOL_MANAGER = "0x8366a39CC670B4001A1121B8F6A443A643e40951";
export const POSITION_MANAGER = "0x58daec3116aae6D93017bAAea7749052E8a04fA7";
export const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
export const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11";
export const EXPLORER = "https://robinhoodchain.blockscout.com";

const ZERO = ethers.ZeroAddress;
const MAX_UINT256 = ethers.MaxUint256;

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const MIN_SLIPPAGE = 0;
const MAX_SLIPPAGE = 50;

const BASIS_POINTS = 10_000n;

// ── ABIs ────────────────────────────────────────────────────────────────────

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
];

const BONDING_CURVE_ABI = [
  "function buy(uint256 minTokensOut, address recipient) external payable returns (uint256 tokensOut)",
  "function sell(uint256 tokensIn, uint256 minEthOut, address recipient) external returns (uint256 ethOut)",
  "function getBuyPrice(uint256 ethIn) external view returns (uint256 tokensOut, uint256 fee)",
  "function getSellPrice(uint256 tokensIn) external view returns (uint256 ethOut, uint256 fee)",
  "function migrated() external view returns (bool)",
  "function thresholdQuote() external view returns (uint256)",
  "function realQuoteReserves() external view returns (uint256)",
];

const LENS_ABI = [
  "function getTokenState(address token) external view returns (address curve, address feeShare, bytes32 poolId, bool migrated, uint256 realQuoteReserves, uint256 thresholdQuote, uint256 virtualQuoteReserves, uint256 virtualBaseReserves, uint256 totalSupply)",
];

const FACTORY_ABI = [
  "function curveForToken(address token) external view returns (address)",
  "function feeShareForToken(address token) external view returns (address)",
  "function creationFee() external view returns (uint256)",
  "function graduationThreshold() external view returns (uint256)",
];

// ── Types ───────────────────────────────────────────────────────────────────

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
  amountIn: string;
  amountInRaw: bigint;
  migrated: boolean;
  poolId: string;
  source: "bonding-curve" | "v4";
}

export interface SellQuote {
  ethOut: string;
  ethOutRaw: bigint;
  fee: string;
  feeRaw: bigint;
  amountIn: string;
  amountInRaw: bigint;
  migrated: boolean;
  poolId: string;
  source: "bonding-curve" | "v4";
}

export interface TradeResult {
  success: boolean;
  hash?: string;
  error?: string;
  explorerUrl?: string;
  phase?: "bonding-curve" | "graduated-v4";
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  gasCostEth: string;
}

// ── Validation ──────────────────────────────────────────────────────────────

function assertAddress(value: string, name: string): string {
  if (!ADDRESS_RE.test(value)) {
    throw new Error(`Invalid ${name} address`);
  }

  return ethers.getAddress(value);
}

function validateSlippage(slippagePct: number): void {
  if (!Number.isFinite(slippagePct)) {
    throw new Error("Invalid slippage");
  }

  if (slippagePct < MIN_SLIPPAGE || slippagePct > MAX_SLIPPAGE) {
    throw new Error(`Slippage must be between ${MIN_SLIPPAGE}% and ${MAX_SLIPPAGE}%`);
  }
}

function parsePositiveEther(value: string): bigint {
  if (!value || typeof value !== "string") {
    throw new Error("Invalid ETH amount");
  }

  const amount = ethers.parseEther(value);

  if (amount <= 0n) {
    throw new Error("Amount must be greater than zero");
  }

  return amount;
}

function parsePositiveWei(value: string): bigint {
  if (!value || !/^\d+$/.test(value)) {
    throw new Error("Invalid token amount");
  }

  const amount = BigInt(value);

  if (amount <= 0n) {
    throw new Error("Amount must be greater than zero");
  }

  return amount;
}

function applySlippage(amount: bigint, slippagePct: number): bigint {
  validateSlippage(slippagePct);

  const slippageBps = BigInt(Math.round(slippagePct * 100));

  return (
    amount *
    (BASIS_POINTS - slippageBps)
  ) / BASIS_POINTS;
}

function formatError(error: unknown): string {
  const err = error as any;

  return (
    err?.shortMessage ||
    err?.reason ||
    err?.info?.error?.message ||
    err?.error?.message ||
    err?.message ||
    "Transaction failed"
  );
}

function explorerTxUrl(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

// ── Provider ────────────────────────────────────────────────────────────────

let primaryProvider: ethers.JsonRpcProvider | null = null;
let backupProvider: ethers.JsonRpcProvider | null = null;

function createProvider(url: string): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(url, {
    chainId: CHAIN_ID,
    name: "robinhood",
  }, {
    staticNetwork: true,
  });
}

export function getProvider(): ethers.JsonRpcProvider {
  if (!primaryProvider) {
    primaryProvider = createProvider(RPC);
  }

  return primaryProvider;
}

function getBackupProvider(): ethers.JsonRpcProvider {
  if (!backupProvider) {
    backupProvider = createProvider(BACKUP_RPC);
  }

  return backupProvider;
}

/**
 * Read from the primary RPC and transparently retry on the backup RPC.
 *
 * We deliberately don't permanently switch providers because the primary
 * endpoint should remain the preferred RPC for normal production traffic.
 */
async function withProviderFailover<T>(
  operation: (provider: ethers.JsonRpcProvider) => Promise<T>,
): Promise<T> {
  try {
    return await operation(getProvider());
  } catch (primaryError) {
    try {
      return await operation(getBackupProvider());
    } catch {
      throw primaryError;
    }
  }
}

export function getWallet(privateKey: string): ethers.Wallet {
  if (!privateKey || typeof privateKey !== "string") {
    throw new Error("Missing private key");
  }

  return new ethers.Wallet(privateKey, getProvider());
}

async function getWalletWithFailover(privateKey: string): Promise<ethers.Wallet> {
  const wallet = new ethers.Wallet(privateKey, getProvider());

  try {
    await wallet.provider!.getNetwork();
    return wallet;
  } catch {
    return new ethers.Wallet(privateKey, getBackupProvider());
  }
}

// ── Network Health ──────────────────────────────────────────────────────────

export async function checkNetwork(): Promise<{
  healthy: boolean;
  chainId: number;
  blockNumber: number;
  rpc: "primary" | "backup";
}> {
  try {
    const provider = getProvider();
    const [network, blockNumber] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
    ]);

    if (Number(network.chainId) !== CHAIN_ID) {
      throw new Error(`Unexpected chain ID: ${network.chainId}`);
    }

    return {
      healthy: true,
      chainId: CHAIN_ID,
      blockNumber,
      rpc: "primary",
    };
  } catch {
    try {
      const provider = getBackupProvider();
      const [network, blockNumber] = await Promise.all([
        provider.getNetwork(),
        provider.getBlockNumber(),
      ]);

      if (Number(network.chainId) !== CHAIN_ID) {
        throw new Error(`Unexpected chain ID: ${network.chainId}`);
      }

      return {
        healthy: true,
        chainId: CHAIN_ID,
        blockNumber,
        rpc: "backup",
      };
    } catch {
      return {
        healthy: false,
        chainId: CHAIN_ID,
        blockNumber: 0,
        rpc: "primary",
      };
    }
  }
}

// ── Token State ─────────────────────────────────────────────────────────────

export async function getTokenState(
  tokenAddress: string,
): Promise<TokenState | null> {
  try {
    const token = assertAddress(tokenAddress, "token");

    return await withProviderFailover(async (provider) => {
      const lens = new ethers.Contract(
        BAGS_LENS,
        LENS_ABI,
        provider,
      );

      const state = await lens.getTokenState(token);

      return {
        token,
        curve: ethers.getAddress(state.curve),
        feeShare: ethers.getAddress(state.feeShare),
        poolId: state.poolId as string,
        migrated: Boolean(state.migrated),
        realQuoteReserves: BigInt(state.realQuoteReserves),
        thresholdQuote: BigInt(state.thresholdQuote),
        virtualQuoteReserves: BigInt(state.virtualQuoteReserves),
        virtualBaseReserves: BigInt(state.virtualBaseReserves),
        totalSupply: BigInt(state.totalSupply),
      };
    });
  } catch {
    return null;
  }
}

/**
 * Re-read migration state immediately before execution.
 *
 * This is intentionally separate from any UI quote so a token that graduates
 * between quoting and signing cannot accidentally be sent through the curve.
 */
export async function requireTokenState(
  tokenAddress: string,
): Promise<TokenState> {
  const state = await getTokenState(tokenAddress);

  if (!state) {
    throw new Error("Unable to read live token state from BagsLens");
  }

  return state;
}

// ── Factory Helpers ─────────────────────────────────────────────────────────

export async function getCurveForToken(
  tokenAddress: string,
): Promise<string | null> {
  try {
    const token = assertAddress(tokenAddress, "token");

    return await withProviderFailover(async (provider) => {
      const factory = new ethers.Contract(
        BAGS_FACTORY,
        FACTORY_ABI,
        provider,
      );

      const curve = await factory.curveForToken(token);

      if (!curve || curve === ZERO) {
        return null;
      }

      return ethers.getAddress(curve);
    });
  } catch {
    return null;
  }
}

// ── Balances ────────────────────────────────────────────────────────────────

export async function getEthBalance(address: string): Promise<string> {
  try {
    const walletAddress = assertAddress(address, "wallet");

    const balance = await withProviderFailover((provider) =>
      provider.getBalance(walletAddress),
    );

    return ethers.formatEther(balance);
  } catch {
    return "0";
  }
}

export async function getEthBalanceRaw(address: string): Promise<bigint> {
  const walletAddress = assertAddress(address, "wallet");

  return withProviderFailover((provider) =>
    provider.getBalance(walletAddress),
  );
}

export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
): Promise<{
  raw: bigint;
  formatted: string;
  decimals: number;
}> {
  try {
    const tokenAddressChecksum = assertAddress(tokenAddress, "token");
    const walletAddressChecksum = assertAddress(walletAddress, "wallet");

    return await withProviderFailover(async (provider) => {
      const token = new ethers.Contract(
        tokenAddressChecksum,
        ERC20_ABI,
        provider,
      );

      const [balance, decimals] = await Promise.all([
        token.balanceOf(walletAddressChecksum),
        token.decimals(),
      ]);

      const raw = BigInt(balance);
      const decimalCount = Number(decimals);

      return {
        raw,
        formatted: ethers.formatUnits(raw, decimalCount),
        decimals: decimalCount,
      };
    });
  } catch {
    return {
      raw: 0n,
      formatted: "0",
      decimals: 18,
    };
  }
}

// ── Token Metadata ──────────────────────────────────────────────────────────

export async function getTokenMetadata(tokenAddress: string): Promise<{
  address: string;
  name: string;
  symbol: string;
  decimals: number;
} | null> {
  try {
    const token = assertAddress(tokenAddress, "token");

    return await withProviderFailover(async (provider) => {
      const contract = new ethers.Contract(token, ERC20_ABI, provider);

      const [name, symbol, decimals] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
      ]);

      return {
        address: token,
        name: String(name),
        symbol: String(symbol),
        decimals: Number(decimals),
      };
    });
  } catch {
    return null;
  }
}

// ── Bonding Curve Quotes ────────────────────────────────────────────────────

async function getBondingCurveBuyQuote(
  state: TokenState,
  amountIn: bigint,
): Promise<{
  tokensOut: bigint;
  fee: bigint;
}> {
  if (state.migrated) {
    throw new Error("Token has graduated; bonding curve is no longer active");
  }

  const provider = getProvider();

  const curve = new ethers.Contract(
    state.curve,
    BONDING_CURVE_ABI,
    provider,
  );

  const [tokensOut, fee] = await curve.getBuyPrice(amountIn);

  return {
    tokensOut: BigInt(tokensOut),
    fee: BigInt(fee),
  };
}

async function getBondingCurveSellQuote(
  state: TokenState,
  amountIn: bigint,
): Promise<{
  ethOut: bigint;
  fee: bigint;
}> {
  if (state.migrated) {
    throw new Error("Token has graduated; bonding curve is no longer active");
  }

  const provider = getProvider();

  const curve = new ethers.Contract(
    state.curve,
    BONDING_CURVE_ABI,
    provider,
  );

  const [ethOut, fee] = await curve.getSellPrice(amountIn);

  return {
    ethOut: BigInt(ethOut),
    fee: BigInt(fee),
  };
}

// ── V4 Quote Boundary ──────────────────────────────────────────────────────

/**
 * Graduated tokens require the Robinhood-specific V4 quoter encoding.
 *
 * We intentionally fail closed until the exact deployed quoter ABI/command
 * format is implemented and tested. Returning zero here would be dangerous
 * because callers could mistake it for a real quote.
 */
async function getV4BuyQuote(
  _state: TokenState,
  _amountIn: bigint,
): Promise<never> {
  throw new Error(
    `Graduated V4 quote unavailable: Robinhood-specific V4 quoter adapter is not enabled yet (${V4_QUOTER})`,
  );
}

async function getV4SellQuote(
  _state: TokenState,
  _amountIn: bigint,
): Promise<never> {
  throw new Error(
    `Graduated V4 quote unavailable: Robinhood-specific V4 quoter adapter is not enabled yet (${V4_QUOTER})`,
  );
}

// ── Public Quotes ───────────────────────────────────────────────────────────

export async function getBuyQuote(
  tokenAddress: string,
  amountEth: string,
): Promise<BuyQuote | null> {
  try {
    const state = await requireTokenState(tokenAddress);
    const amountIn = parsePositiveEther(amountEth);

    if (!state.migrated) {
      const quote = await getBondingCurveBuyQuote(state, amountIn);

      return {
        tokensOut: ethers.formatEther(quote.tokensOut),
        tokensOutRaw: quote.tokensOut,
        fee: ethers.formatEther(quote.fee),
        feeRaw: quote.fee,
        amountIn: ethers.formatEther(amountIn),
        amountInRaw: amountIn,
        migrated: false,
        poolId: state.poolId,
        source: "bonding-curve",
      };
    }

    const quote = await getV4BuyQuote(state, amountIn);

    return {
      tokensOut: ethers.formatEther(quote.tokensOut),
      tokensOutRaw: quote.tokensOut,
      fee: ethers.formatEther(quote.fee),
      feeRaw: quote.fee,
      amountIn: ethers.formatEther(amountIn),
      amountInRaw: amountIn,
      migrated: true,
      poolId: state.poolId,
      source: "v4",
    };
  } catch {
    return null;
  }
}

export async function getSellQuote(
  tokenAddress: string,
  amountTokenWei: string,
): Promise<SellQuote | null> {
  try {
    const state = await requireTokenState(tokenAddress);
    const amountIn = parsePositiveWei(amountTokenWei);

    if (!state.migrated) {
      const quote = await getBondingCurveSellQuote(state, amountIn);

      return {
        ethOut: ethers.formatEther(quote.ethOut),
        ethOutRaw: quote.ethOut,
        fee: ethers.formatEther(quote.fee),
        feeRaw: quote.fee,
        amountIn: amountIn.toString(),
        amountInRaw: amountIn,
        migrated: false,
        poolId: state.poolId,
        source: "bonding-curve",
      };
    }

    const quote = await getV4SellQuote(state, amountIn);

    return {
      ethOut: ethers.formatEther(quote.ethOut),
      ethOutRaw: quote.ethOut,
      fee: ethers.formatEther(quote.fee),
      feeRaw: quote.fee,
      amountIn: amountIn.toString(),
      amountInRaw: amountIn,
      migrated: true,
      poolId: state.poolId,
      source: "v4",
    };
  } catch {
    return null;
  }
}

// ── Gas ─────────────────────────────────────────────────────────────────────

export async function estimateGas(): Promise<string> {
  try {
    const provider = getProvider();
    const feeData = await provider.getFeeData();

    const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n;

    if (gasPrice <= 0n) {
      return "0";
    }

    const estimated = gasPrice * 300_000n;

    return ethers.formatEther(estimated);
  } catch {
    return "0";
  }
}

export async function estimateTransactionGas(
  tx: ethers.TransactionRequest,
): Promise<GasEstimate> {
  return withProviderFailover(async (provider) => {
    const [gasLimit, feeData] = await Promise.all([
      provider.estimateGas(tx),
      provider.getFeeData(),
    ]);

    const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n;
    const gasCost = gasLimit * gasPrice;

    return {
      gasLimit: gasLimit.toString(),
      gasPrice: gasPrice.toString(),
      gasCostEth: ethers.formatEther(gasCost),
    };
  });
}

// ── Transaction Helpers ─────────────────────────────────────────────────────

async function waitForReceipt(
  tx: ethers.TransactionResponse,
): Promise<ethers.TransactionReceipt> {
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error("Transaction was not mined");
  }

  if (receipt.status !== 1) {
    throw new Error("Transaction reverted");
  }

  return receipt;
}

async function ensureEthBalance(
  wallet: ethers.Wallet,
  amount: bigint,
  gasReserve = 0n,
): Promise<void> {
  const balance = await wallet.provider!.getBalance(wallet.address);

  if (balance < amount + gasReserve) {
    throw new Error(
      `Insufficient ETH balance. Required at least ${ethers.formatEther(
        amount + gasReserve,
      )} ETH`,
    );
  }
}

async function ensureTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  amount: bigint,
): Promise<void> {
  const token = new ethers.Contract(
    tokenAddress,
    ERC20_ABI,
    getProvider(),
  );

  const balance = BigInt(await token.balanceOf(walletAddress));

  if (balance < amount) {
    throw new Error(
      `Insufficient token balance. Required ${amount.toString()} wei`,
    );
  }
}

// ── Bonding Curve Buy ───────────────────────────────────────────────────────

async function buyBondingCurve(
  wallet: ethers.Wallet,
  state: TokenState,
  amountIn: bigint,
  slippagePct: number,
): Promise<TradeResult> {
  const curve = new ethers.Contract(
    state.curve,
    BONDING_CURVE_ABI,
    wallet,
  );

  const [tokensOut] = await curve.getBuyPrice(amountIn);

  const quotedTokens = BigInt(tokensOut);

  if (quotedTokens <= 0n) {
    throw new Error("Bonding curve returned zero tokens");
  }

  const minTokensOut = applySlippage(
    quotedTokens,
    slippagePct,
  );

  const populated = await curve.buy.populateTransaction(
    minTokensOut,
    wallet.address,
    {
      value: amountIn,
    },
  );

  const gasLimit = await wallet.estimateGas(populated);

  const tx = await curve.buy(
    minTokensOut,
    wallet.address,
    {
      value: amountIn,
      gasLimit: gasLimit + (gasLimit * 15n) / 100n,
    },
  );

  const receipt = await waitForReceipt(tx);

  return {
    success: true,
    hash: receipt.hash,
    explorerUrl: explorerTxUrl(receipt.hash),
    phase: "bonding-curve",
  };
}

// ── Bonding Curve Sell ──────────────────────────────────────────────────────

async function sellBondingCurve(
  wallet: ethers.Wallet,
  state: TokenState,
  tokenAddress: string,
  amountIn: bigint,
  slippagePct: number,
): Promise<TradeResult> {
  await ensureTokenBalance(
    tokenAddress,
    wallet.address,
    amountIn,
  );

  const token = new ethers.Contract(
    tokenAddress,
    ERC20_ABI,
    wallet,
  );

  const allowance = BigInt(
    await token.allowance(wallet.address, state.curve),
  );

  if (allowance < amountIn) {
    const approveTx = await token.approve(
      state.curve,
      amountIn,
    );

    await waitForReceipt(approveTx);
  }

  const curve = new ethers.Contract(
    state.curve,
    BONDING_CURVE_ABI,
    wallet,
  );

  const [ethOut] = await curve.getSellPrice(amountIn);

  const quotedEth = BigInt(ethOut);

  if (quotedEth <= 0n) {
    throw new Error("Bonding curve returned zero ETH");
  }

  const minEthOut = applySlippage(
    quotedEth,
    slippagePct,
  );

  const populated = await curve.sell.populateTransaction(
    amountIn,
    minEthOut,
    wallet.address,
  );

  const gasLimit = await wallet.estimateGas(populated);

  const tx = await curve.sell(
    amountIn,
    minEthOut,
    wallet.address,
    {
      gasLimit: gasLimit + (gasLimit * 15n) / 100n,
    },
  );

  const receipt = await waitForReceipt(tx);

  return {
    success: true,
    hash: receipt.hash,
    explorerUrl: explorerTxUrl(receipt.hash),
    phase: "bonding-curve",
  };
}

// ── Graduated V4 Boundary ──────────────────────────────────────────────────

async function buyGraduatedV4(
  _wallet: ethers.Wallet,
  _state: TokenState,
  _amountIn: bigint,
  _slippagePct: number,
): Promise<TradeResult> {
  return {
    success: false,
    phase: "graduated-v4",
    error:
      "Token is graduated. Robinhood-specific Uniswap V4 execution is not enabled yet; trade blocked to protect funds.",
  };
}

async function sellGraduatedV4(
  _wallet: ethers.Wallet,
  _state: TokenState,
  _tokenAddress: string,
  _amountIn: bigint,
  _slippagePct: number,
): Promise<TradeResult> {
  return {
    success: false,
    phase: "graduated-v4",
    error:
      "Token is graduated. Robinhood-specific Uniswap V4 execution is not enabled yet; trade blocked to protect funds.",
  };
}

// ── Buy Token ───────────────────────────────────────────────────────────────

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
}): Promise<TradeResult> {
  try {
    assertAddress(tokenAddress, "token");
    validateSlippage(slippagePct);

    const amountIn = parsePositiveEther(amountEth);
    const wallet = await getWalletWithFailover(privateKey);

    /*
     * CRITICAL:
     * Re-read BagsLens immediately before execution.
     * A token can graduate after the UI displayed a bonding-curve quote.
     */
    const state = await requireTokenState(tokenAddress);

    /*
     * Reserve a small amount for gas. The exact required gas is estimated
     * later, but this prevents obviously impossible ETH trades.
     */
    const feeData = await wallet.provider!.getFeeData();
    const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas ?? 0n;
    const gasReserve = gasPrice * 700_000n;

    await ensureEthBalance(
      wallet,
      amountIn,
      gasReserve,
    );

    if (!state.migrated) {
      return await buyBondingCurve(
        wallet,
        state,
        amountIn,
        slippagePct,
      );
    }

    return await buyGraduatedV4(
      wallet,
      state,
      amountIn,
      slippagePct,
    );
  } catch (error) {
    return {
      success: false,
      error: formatError(error),
    };
  }
}

// ── Sell Token ──────────────────────────────────────────────────────────────

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
}): Promise<TradeResult> {
  try {
    assertAddress(tokenAddress, "token");
    validateSlippage(slippagePct);

    const amountIn = parsePositiveWei(amountTokenWei);
    const wallet = await getWalletWithFailover(privateKey);

    /*
     * Re-read live phase before touching approvals or submitting a trade.
     */
    const state = await requireTokenState(tokenAddress);

    if (!state.migrated) {
      return await sellBondingCurve(
        wallet,
        state,
        ethers.getAddress(tokenAddress),
        amountIn,
        slippagePct,
      );
    }

    return await sellGraduatedV4(
      wallet,
      state,
      ethers.getAddress(tokenAddress),
      amountIn,
      slippagePct,
    );
  } catch (error) {
    return {
      success: false,
      error: formatError(error),
    };
  }
}

// ── Convenience Functions ──────────────────────────────────────────────────

export async function isGraduated(
  tokenAddress: string,
): Promise<boolean | null> {
  const state = await getTokenState(tokenAddress);

  return state ? state.migrated : null;
}

export async function getPhase(
  tokenAddress: string,
): Promise<"bonding-curve" | "graduated-v4" | null> {
  const state = await getTokenState(tokenAddress);

  if (!state) {
    return null;
  }

  return state.migrated
    ? "graduated-v4"
    : "bonding-curve";
}
