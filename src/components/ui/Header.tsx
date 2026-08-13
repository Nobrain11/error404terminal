// src/components/Header.tsx
"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { Page } from "../Terminal";

export default function Header({ page, onNavigate }: { page: string; onNavigate: (p: Page) => void }) {
  const { wallet, status, error, connectExistingWallet, createWallet, importWallet, disconnect } = useAuth();
  const [showConnect, setShowConnect] = useState(false);
  const [mode, setMode] = useState<"choose" | "import" | "reveal">("choose");
  const [importInput, setImportInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newWallet, setNewWallet] = useState<{ address: string; privateKey: string } | null>(null);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

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

  async function handleConnectExisting() {
    setSubmitting(true);
    await connectExistingWallet();
    setSubmitting(false);
    setShowConnect(false);
    setMode("choose");
  }

  async function handleCreate() {
    setSubmitting(true);
    const result = await createWallet();
    setSubmitting(false);
    if (result) {
      setNewWallet(result);
      setConfirmedSaved(false);
      setMode("reveal");
    }
  }

  async function handleImport() {
    if (!importInput.trim()) return;
    setSubmitting(true);
    const ok = await importWallet(importInput.trim());
    setSubmitting(false);
    if (ok) {
      setShowConnect(false);
      setMode("choose");
      setImportInput("");
    }
  }

  function closeReveal() {
    if (!confirmedSaved) return;
    setNewWallet(null);
    setShowConnect(false);
    setMode("choose");
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
              onClick={() => { setShowConnect(s => !s); setMode("choose"); }}
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
          position: "absolute", top: "100%", right: 12, marginTop: 6, width: 270,
          background: "#121214", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14, padding: 14, zIndex: 200,
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}>
          {mode === "choose" && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Sign In</div>
              <div style={{ fontSize: 11, color: "#8e8e93", marginBottom: 10 }}>
                Connect a wallet to start trading on-chain.
              </div>

              <button
                onClick={handleConnectExisting}
                disabled={submitting}
                style={{
                  display: "block", width: "100%", textAlign: "center", padding: "10px", marginBottom: 8,
                  background: "#00C805", color: "#000", borderRadius: 10, border: "none",
                  fontSize: 12, fontWeight: 700, cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                🦊 Connect Wallet
              </button>

              <button
                onClick={handleCreate}
                disabled={submitting}
                style={{
                  display: "block", width: "100%", textAlign: "center", padding: "10px", marginBottom: 8,
                  background: "rgba(255,255,255,0.05)", color: "#f2f2f7", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: 12, fontWeight: 700, cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                ✨ Create New Wallet
              </button>

              <button
                onClick={() => setMode("import")}
                style={{
                  display: "block", width: "100%", textAlign: "center", padding: "10px",
                  background: "none", color: "#8e8e93", borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.1)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                📥 Import Wallet
              </button>

              {error && <div style={{ fontSize: 10, color: "#FF3B30", marginTop: 8 }}>{error}</div>}
            </>
          )}

          {mode === "import" && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Import Wallet</div>
              <div style={{ fontSize: 11, color: "#8e8e93", marginBottom: 10 }}>
                Paste your private key or 12/24-word recovery phrase.
              </div>
              <textarea
                value={importInput}
                onChange={e => setImportInput(e.target.value)}
                placeholder="0x... or word word word..."
                rows={3}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, padding: "9px 10px", fontSize: 11, color: "#f2f2f7",
                  outline: "none", fontFamily: "monospace", marginBottom: 8, resize: "none",
                }}
              />
              {error && <div style={{ fontSize: 10, color: "#FF3B30", marginBottom: 8 }}>{error}</div>}
              <button
                onClick={handleImport}
                disabled={submitting || !importInput.trim()}
                style={{
                  width: "100%", padding: "9px", borderRadius: 8, border: "none",
                  background: submitting ? "rgba(0,200,5,0.4)" : "#00C805", color: "#000",
                  fontSize: 12, fontWeight: 700, cursor: submitting ? "default" : "pointer", marginBottom: 6,
                }}
              >
                {submitting ? "Importing…" : "Import"}
              </button>
              <button
                onClick={() => setMode("choose")}
                style={{
                  width: "100%", padding: "8px", borderRadius: 8, border: "none",
                  background: "none", color: "#8e8e93", fontSize: 11, cursor: "pointer",
                }}
              >
                ← Back
              </button>
            </>
          )}

          {mode === "reveal" && newWallet && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: "#FF3B30" }}>
                Save Your Private Key
              </div>
              <div style={{ fontSize: 11, color: "#8e8e93", marginBottom: 8 }}>
                Shown once. Anyone with this key controls your funds.
              </div>
              <div style={{
                fontFamily: "monospace", fontSize: 10, background: "#000",
                border: "1px solid rgba(255,59,48,0.4)", borderRadius: 8,
                padding: 8, wordBreak: "break-all", color: "#f2f2f7", marginBottom: 8,
              }}>
                {newWallet.privateKey}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#f2f2f7", marginBottom: 10 }}>
                <input type="checkbox" checked={confirmedSaved} onChange={e => setConfirmedSaved(e.target.checked)} />
                I've saved my private key
              </label>
              <button
                onClick={closeReveal}
                disabled={!confirmedSaved}
                style={{
                  width: "100%", padding: "9px", borderRadius: 8, border: "none",
                  background: confirmedSaved ? "#00C805" : "rgba(0,200,5,0.3)", color: "#000",
                  fontSize: 12, fontWeight: 700, cursor: confirmedSaved ? "pointer" : "default",
                }}
              >
                Done
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
