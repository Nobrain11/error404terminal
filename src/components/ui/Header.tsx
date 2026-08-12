"use client";
import { useAuth } from "@/lib/auth-context";
import type { Page } from "../Terminal";

export default function Header({ page, onNavigate }: { page: string; onNavigate: (p: Page) => void }) {
  const { wallet, status, connect } = useAuth();

  const TITLES: Record<string, string> = {
    discover: "Discover",
    trade: "Trade",
    scanner: "Scanner",
    portfolio: "Portfolio",
    orders: "Orders",
    tracking: "Tracking",
    referral: "Referral",
    settings: "Settings",
  };

  function short(addr: string) {
    return `${addr.slice(0, 5)}…${addr.slice(-3)}`;
  }

  return (
    <div style={{
      padding: "12px 18px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid rgba(255,255,255,0.08)",
      flexShrink: 0,
      background: "rgba(10,10,11,0.95)",
      gap: 8,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.02em", flexShrink: 0 }}>
        ERROR<span style={{ color: "#00C805" }}>404</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#f2f2f7", flex: 1, textAlign: "center" }}>
        {TITLES[page] || "Terminal"}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {status === "connected" && wallet ? (
          <div style={{
            fontSize: 10, fontWeight: 700, padding: "5px 8px",
            background: "rgba(0,200,5,0.12)", border: "1px solid rgba(0,200,5,0.3)",
            borderRadius: 100, color: "#00C805", fontFamily: "monospace",
          }}>
            {short(wallet.address)}
          </div>
        ) : status === "connecting" ? (
          <div style={{
            fontSize: 10, fontWeight: 600, padding: "5px 8px",
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 100, color: "#8e8e93",
          }}>
            Connecting…
          </div>
        ) : (
          <button
            onClick={connect}
            style={{
              fontSize: 11, fontWeight: 700, padding: "6px 10px",
              background: "#00C805", border: "none",
              borderRadius: 100, color: "#000", cursor: "pointer",
            }}
          >
            Connect
          </button>
        )}

        <button
          onClick={() => onNavigate("settings")}
          style={{
            width: 30, height: 30, borderRadius: "50%",
            background: page === "settings" ? "rgba(0,200,5,0.12)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${page === "settings" ? "rgba(0,200,5,0.3)" : "rgba(255,255,255,0.1)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 14, flexShrink: 0,
            color: page === "settings" ? "#00C805" : "#8e8e93",
          }}
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}
