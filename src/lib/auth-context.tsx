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
  error: string | null;
  connect: () => Promise<void>;
  connectWithCode: (code: string) => Promise<boolean>;
  disconnect: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  wallet: null,
  status: "idle",
  error: null,
  connect: async () => {},
  connectWithCode: async () => false,
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
  const [error, setError] = useState<string | null>(null);

  const applySession = (data: any) => {
    setToken(data.token);
    setUser(data.user);
    setWallet(data.wallet);
    setStatus("connected");
    localStorage.setItem("token", data.token);
  };

  const connect = useCallback(async () => {
    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;

    if (!tg || !tg.initData) {
      setStatus("unavailable");
      return;
    }

    setStatus("connecting");
    setError(null);
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
      applySession(data);
    } catch (e) {
      console.error("Telegram connect failed", e);
      setStatus("unavailable");
    }
  }, []);

  const connectWithCode = useCallback(async (code: string) => {
    setStatus("connecting");
    setError(null);
    try {
      const res = await fetch("/api/auth/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid code");
        setStatus("unavailable");
        return false;
      }
      applySession(data);
      return true;
    } catch (e) {
      console.error("Code connect failed", e);
      setError("Network error");
      setStatus("unavailable");
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    setToken(null);
    setUser(null);
    setWallet(null);
    setStatus("idle");
    localStorage.removeItem("token");
  }, []);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      connect();
    } else {
      setStatus("unavailable");
    }
  }, [connect]);

  return (
    <AuthContext.Provider value={{ token, user, wallet, status, error, connect, connectWithCode, disconnect }}>
      {children}
    </AuthContext.Provider>
  );
}
