// src/lib/auth-context.tsx
"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ethers } from "ethers";

interface AuthWallet {
  address: string;
  name: string;
}

interface AuthContextValue {
  token: string | null;
  wallet: AuthWallet | null;
  status: "idle" | "connecting" | "connected" | "unavailable";
  error: string | null;
  connectExistingWallet: () => Promise<void>;
  createWallet: () => Promise<{ address: string; privateKey: string } | null>;
  importWallet: (input: string) => Promise<boolean>;
  disconnect: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  wallet: null,
  status: "idle",
  error: null,
  connectExistingWallet: async () => {},
  createWallet: async () => null,
  importWallet: async () => false,
  disconnect: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [wallet, setWallet] = useState<AuthWallet | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("idle");
  const [error, setError] = useState<string | null>(null);

  const applySession = (data: { token: string; wallet?: AuthWallet; address?: string }) => {
    setToken(data.token);
    setWallet(data.wallet ?? (data.address ? { address: data.address, name: "Wallet 1" } : null));
    setStatus("connected");
    localStorage.setItem("token", data.token);
  };

  const connectExistingWallet = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined" || !window.ethereum) {
      setError("No wallet found. Install MetaMask or another browser wallet.");
      setStatus("unavailable");
      return;
    }
    setStatus("connecting");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts: string[] = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      const nonceRes = await fetch(`/api/auth/nonce?address=${address}`);
      const { message, nonce } = await nonceRes.json();

      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);

      const res = await fetch("/api/auth/wallet-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, message, nonce }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not connect wallet.");
        setStatus("unavailable");
        return;
      }
      applySession(data);
    } catch (e) {
      console.error("Wallet connect failed", e);
      setError("Connection was cancelled or failed.");
      setStatus("unavailable");
    }
  }, []);

  const createWallet = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    try {
      const res = await fetch("/api/auth/wallet-create", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create wallet.");
        setStatus("unavailable");
        return null;
      }
      applySession(data);
      return { address: data.address, privateKey: data.privateKey };
    } catch (e) {
      console.error("Wallet create failed", e);
      setError("Network error.");
      setStatus("unavailable");
      return null;
    }
  }, []);

  const importWallet = useCallback(async (input: string) => {
    setError(null);
    setStatus("connecting");
    try {
      const res = await fetch("/api/auth/wallet-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not import wallet.");
        setStatus("unavailable");
        return false;
      }
      applySession(data);
      return true;
    } catch (e) {
      console.error("Wallet import failed", e);
      setError("Network error.");
      setStatus("unavailable");
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    setToken(null);
    setWallet(null);
    setStatus("idle");
    localStorage.removeItem("token");
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (saved) {
      // Token exists locally; treat as connected. Add a /api/auth/me check here
      // later if you want to validate it against the Session table on load.
      setToken(saved);
      setStatus("connected");
    } else {
      setStatus("idle");
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, wallet, status, error, connectExistingWallet, createWallet, importWallet, disconnect }}
    >
      {children}
    </AuthContext.Provider>
  );
}
