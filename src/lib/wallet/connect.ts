// src/lib/wallet/connect.ts
// ERROR404 Terminal — injected wallet connection (MetaMask/Rabby/Coinbase/etc.)
// Uses window.ethereum directly since the project has no wagmi/WalletConnect dep.

import { ethers, type Eip1193Provider } from "ethers";
import { ROBINHOOD_CHAIN_ID } from "@/lib/dex/swapV2";

const ROBINHOOD_RPC = "https://rpc.mainnet.chain.robinhood.com";
const ROBINHOOD_EXPLORER = "https://robinhoodchain.blockscout.com";

// NOTE: native currency symbol assumed "ETH" per the spec's own terminology
// (ETH -> token quotes, ETH balance, etc). Confirm against the chain's real
// wallet_addEthereumChain params before shipping if this differs.
const ROBINHOOD_CHAIN_PARAMS = {
  chainId: ethers.toQuantity(ROBINHOOD_CHAIN_ID),
  chainName: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: [ROBINHOOD_RPC],
  blockExplorerUrls: [ROBINHOOD_EXPLORER],
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      isMetaMask?: boolean;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export class WalletError extends Error {
  code: "NO_PROVIDER" | "USER_REJECTED" | "SWITCH_FAILED" | "UNKNOWN";
  constructor(code: WalletError["code"], message: string) {
    super(message);
    this.code = code;
    this.name = "WalletError";
  }
}

export function hasInjectedWallet(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

export function getBrowserProvider(): ethers.BrowserProvider {
  if (!hasInjectedWallet()) {
    throw new WalletError(
      "NO_PROVIDER",
      "No wallet found. Install MetaMask or another browser wallet to continue."
    );
  }
  return new ethers.BrowserProvider(window.ethereum!);
}

export async function connectWallet(): Promise<{
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
  address: string;
}> {
  const provider = getBrowserProvider();
  let accounts: string[];
  try {
    accounts = await provider.send("eth_requestAccounts", []);
  } catch (err: any) {
    if (err?.code === 4001) {
      throw new WalletError("USER_REJECTED", "Wallet connection was rejected.");
    }
    throw new WalletError("UNKNOWN", "Could not connect to wallet.");
  }
  if (!accounts?.length) {
    throw new WalletError("UNKNOWN", "No accounts returned by wallet.");
  }
  const signer = await provider.getSigner();
  return { provider, signer, address: accounts[0] };
}

export async function disconnectWallet(): Promise<void> {
  // EIP-1193 has no standard "disconnect" — this just clears local app state.
  // The actual revocation happens in the wallet's own UI.
  return;
}

export async function getCurrentChainId(provider: ethers.BrowserProvider): Promise<number> {
  const network = await provider.getNetwork();
  return Number(network.chainId);
}

export async function isOnRobinhoodChain(provider: ethers.BrowserProvider): Promise<boolean> {
  return (await getCurrentChainId(provider)) === ROBINHOOD_CHAIN_ID;
}

export async function switchToRobinhoodChain(provider: ethers.BrowserProvider): Promise<void> {
  try {
    await provider.send("wallet_switchEthereumChain", [
      { chainId: ROBINHOOD_CHAIN_PARAMS.chainId },
    ]);
  } catch (err: any) {
    // 4902 = chain not added to wallet yet
    if (err?.code === 4902 || err?.error?.code === 4902) {
      try {
        await provider.send("wallet_addEthereumChain", [ROBINHOOD_CHAIN_PARAMS]);
      } catch {
        throw new WalletError("SWITCH_FAILED", "Could not add Robinhood Chain to your wallet.");
      }
      return;
    }
    if (err?.code === 4001) {
      throw new WalletError("USER_REJECTED", "Network switch was rejected.");
    }
    throw new WalletError("SWITCH_FAILED", "Could not switch to Robinhood Chain.");
  }
}

export async function getEthBalance(
  provider: ethers.BrowserProvider,
  address: string
): Promise<string> {
  const balWei = await provider.getBalance(address);
  return ethers.formatEther(balWei);
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function explorerAddressUrl(address: string): string {
  return `${ROBINHOOD_EXPLORER}/address/${address}`;
}

export function explorerTxUrl(hash: string): string {
  return `${ROBINHOOD_EXPLORER}/tx/${hash}`;
}

// ─── Live account/chain change listeners (call once, e.g. in a top-level hook) ───

export function subscribeToWalletEvents(handlers: {
  onAccountsChanged?: (accounts: string[]) => void;
  onChainChanged?: (chainId: string) => void;
}): () => void {
  if (!hasInjectedWallet() || !window.ethereum?.on) return () => {};

  const accountsHandler = (accounts: string[]) => handlers.onAccountsChanged?.(accounts);
  const chainHandler = (chainId: string) => handlers.onChainChanged?.(chainId);

  window.ethereum.on("accountsChanged", accountsHandler);
  window.ethereum.on("chainChanged", chainHandler);

  return () => {
    window.ethereum?.removeListener?.("accountsChanged", accountsHandler);
    window.ethereum?.removeListener?.("chainChanged", chainHandler);
  };
}
