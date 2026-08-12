// src/components/WalletConnect.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  connectWallet,
  disconnectWallet,
  hasInjectedWallet,
  isOnRobinhoodChain,
  switchToRobinhoodChain,
  getEthBalance,
  formatAddress,
  explorerAddressUrl,
  subscribeToWalletEvents,
  WalletError,
} from "@/lib/wallet/connect";
import { getTokenBalance } from "@/lib/dex/swapV2";
import { DEFAULT_TOKEN } from "@/config/tokens";

type Status = "disconnected" | "connecting" | "connected" | "wrong_network" | "switching";

export default function WalletConnect() {
  const [status, setStatus] = useState<Status>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refreshBalances = useCallback(async (provider: ethers.BrowserProvider, addr: string) => {
    try {
      const [eth, token] = await Promise.all([
        getEthBalance(provider, addr),
        getTokenBalance(provider, DEFAULT_TOKEN.address, addr).catch(() => null),
      ]);
      setEthBalance(eth);
      setTokenBalance(token ? token.formatted : null);
    } catch {
      setEthBalance(null);
      setTokenBalance(null);
    }
  }, []);

  const handleConnect = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    try {
      const { provider, address: addr } = await connectWallet();
      const onChain = await isOnRobinhoodChain(provider);
      if (!onChain) {
        setStatus("wrong_network");
        setAddress(addr);
        return;
      }
      setAddress(addr);
      setStatus("connected");
      await refreshBalances(provider, addr);
    } catch (err) {
      setStatus("disconnected");
      setError(err instanceof WalletError ? err.message : "Could not connect wallet.");
    }
  }, [refreshBalances]);

  const handleSwitch = useCallback(async () => {
    setError(null);
    setStatus("switching");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum!);
      await switchToRobinhoodChain(provider);
      const onChain = await isOnRobinhoodChain(provider);
      if (onChain && address) {
        setStatus("connected");
        await refreshBalances(provider, address);
      } else {
        setStatus("wrong_network");
      }
    } catch (err) {
      setStatus("wrong_network");
      setError(err instanceof WalletError ? err.message : "Could not switch network.");
    }
  }, [address, refreshBalances]);

  const handleDisconnect = useCallback(async () => {
    await disconnectWallet();
    setStatus("disconnected");
    setAddress(null);
    setEthBalance(null);
    setTokenBalance(null);
    setError(null);
  }, []);

  const handleCopy = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [address]);

  // React to account/network changes from the wallet itself
  useEffect(() => {
    const unsubscribe = subscribeToWalletEvents({
      onAccountsChanged: (accounts) => {
        if (!accounts.length) {
          handleDisconnect();
        } else {
          setAddress(accounts[0]);
          if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum);
            refreshBalances(provider, accounts[0]);
          }
        }
      },
      onChainChanged: () => {
        // Simplest safe response to a chain change: re-run the connect check
        if (address) handleConnect();
      },
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ──────────────────────────────────────────────────────────

  if (!hasInjectedWallet()) {
    return (
      <a
        href="https://metamask.io/download"
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
      >
        Install Wallet
      </a>
    );
  }

  if (status === "disconnected") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleConnect}
          className="px-4 py-2 rounded-lg bg-emerald-500 text-black text-sm font-semibold hover:bg-emerald-400 transition-colors"
        >
          Connect Wallet
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  if (status === "connecting" || status === "switching") {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-400 text-sm font-medium animate-pulse"
      >
        {status === "connecting" ? "Connecting…" : "Switching network…"}
      </button>
    );
  }

  if (status === "wrong_network") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={handleSwitch}
          className="px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors"
        >
          Wrong Network — Switch to Robinhood Chain
        </button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    );
  }

  // connected
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
      <div className="flex flex-col text-right leading-tight">
        <span className="text-xs text-zinc-500 font-mono">
          {ethBalance ? `${Number(ethBalance).toFixed(4)} ETH` : "DATA UNAVAILABLE"}
        </span>
        <span className="text-xs text-emerald-400 font-mono">
          {tokenBalance ? `${Number(tokenBalance).toFixed(2)} $${DEFAULT_TOKEN.symbol}` : "DATA UNAVAILABLE"}
        </span>
      </div>

      <div className="w-px h-8 bg-zinc-800" />

      <button
        onClick={handleCopy}
        className="font-mono text-sm text-zinc-200 hover:text-emerald-400 transition-colors"
        title="Copy address"
      >
        {copied ? "Copied!" : formatAddress(address!)}
      </button>

      <a
        href={explorerAddressUrl(address!)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-500 hover:text-zinc-300 text-xs"
        title="View on explorer"
      >
        ↗
      </a>

      <button
        onClick={handleDisconnect}
        className="text-zinc-500 hover:text-red-400 text-xs"
        title="Disconnect"
      >
        ✕
      </button>
    </div>
  );
}
