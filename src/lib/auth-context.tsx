"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface AuthUser {
  id: string;
  telegramId: string;
  username?: string;
}

interface AuthWallet {
  address: string;
  name: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  wallet: AuthWallet | null;
  status: "idle" | "connecting" | "connected" | "unavailable";
  connect: () => Promise<void>;
  disconnect: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  wallet: null,
  status: "idle",
  connect: async () => {},
  disconnect: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initData: string;
      };
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [wallet, setWallet] = useState<AuthWallet | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("idle");

  const connect = useCallback(async () => {
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

    if (!tg || !tg.initData) {
      setStatus("unavailable");
      return;
    }

    setStatus("connecting");
    try {
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: tg.initData }),
      });
      if (!res.ok) {
        setStatus("unavailable");
        return;
      }
      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      setWallet(data.wallet);
      setStatus("connected");
      localStorage.setItem("token", data.token);
    } catch (e) {
      console.error("Telegram connect failed", e);
      setStatus("unavailable");
    }
  }, []);

  const disconnect = useCallback(() => {
    setToken(null);
    setUser(null);
    setWallet(null);
    setStatus("idle");
    localStorage.removeItem("token");
  }, []);

  // Runs after initial render — never blocks page load
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      connect();
    }
  }, [connect]);

  return (
    <AuthContext.Provider value={{ token, user, wallet, status, connect, disconnect }}>
      {children}
    </AuthContext.Provider>
  );
}
