"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Page } from "../Terminal";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "";

export default function Header({ page, onNavigate }: { page: string; onNavigate: (p: Page) => void }) {
  const { wallet, status, error, connectWithCode } = useAuth();
  const [showConnect, setShowConnect] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  async function handleCodeSubmit() {
    if (!codeInput.trim()) return;
    setSubmitting(true);
    const ok = await connectWithCode(codeInput.trim());
    setSubmitting(false);
    if (ok) {
      setShowConnect(false);
      setCodeInput("");
    }
  }

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        padding: "12px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
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
              onClick={() => setShowConnect(s => !s)}
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

      {showConnect && status !== "connected" && (
        <div style={{
          position: "absolute", top: "100%", right: 12, marginTop: 6, width: 260,
          background: "#121214", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14, padding: 14, zIndex: 200,
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Sign In</div>
          <div style={{ fontSize: 11, color: "#8e8e93", marginBottom: 10 }}>
            Connect to start trading on-chain.
          </div>

          {BOT_USERNAME && (
            <a
              href={`https://t.me/${BOT_USERNAME}?start=link`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "block", textAlign: "center", padding: "10px", marginBottom: 10,
                background: "#00C805", color: "#000", borderRadius: 10,
                fontSize: 12, fontWeight: 700, textDecoration: "none",
              }}
            >
              💬 Open in Telegram
            </a>
          )}

          <div style={{ fontSize: 10, color: "#48484a", textAlign: "center", marginBottom: 8 }}>
            or enter your login code
          </div>
          <input
            value={codeInput}
            onChange={e => setCodeInput(e.target.value.toUpperCase())}
            placeholder="Send /link to the bot"
            style={{
              width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, padding: "9px 10px", fontSize: 12, color: "#f2f2f7",
              outline: "none", fontFamily: "monospace", marginBottom: 8, textTransform: "uppercase",
            }}
          />
          {error && <div style={{ fontSize: 10, color: "#FF3B30", marginBottom: 8 }}>{error}</div>}
          <button
            onClick={handleCodeSubmit}
            disabled={submitting || !codeInput.trim()}
            style={{
              width: "100%", padding: "9px", borderRadius: 8, border: "none",
              background: submitting ? "rgba(0,200,5,0.4)" : "#00C805", color: "#000",
              fontSize: 12, fontWeight: 700, cursor: submitting ? "default" : "pointer",
            }}
          >
            {submitting ? "Verifying…" : "Connect"}
          </button>
        </div>
      )}
    </div>
  );
}
