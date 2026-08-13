// src/components/pages/PortfolioPage.tsx
"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

const TABS = ["Holdings", "PnL", "History", "Wallets"];

export default function PortfolioPage() {
  const { wallet, status, error, connectExistingWallet, createWallet, disconnect } = useAuth();
  const [tab, setTab] = useState("Holdings");
  const [inputAddr, setInputAddr] = useState("");
  const [watchAddress, setWatchAddress] = useState("");
  const [balance, setBalance] = useState<any>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Reveal-once modal state for a freshly created custodial wallet
  const [newWallet, setNewWallet] = useState<{ address: string; privateKey: string } | null>(null);
  const [confirmedSaved, setConfirmedSaved] = useState(false);
  const [creating, setCreating] = useState(false);

  const activeAddress = watchAddress || wallet?.address || "";

  async function fetchBalance(addr: string) {
    if (!addr || addr.length !== 42) return;
    setLoadingBalance(true);
    try {
      const res = await fetch(`/api/wallet/balance?address=${addr}`);
      const data = await res.json();
      setBalance(data);
    } catch {
      console.error("Failed to fetch balance");
    } finally {
      setLoadingBalance(false);
    }
  }

  useEffect(() => {
    if (activeAddress) fetchBalance(activeAddress);
    else setBalance(null);
  }, [activeAddress]);

  async function handleCreateWallet() {
    setCreating(true);
    const result = await createWallet();
    setCreating(false);
    if (result) {
      setNewWallet(result);
      setConfirmedSaved(false);
    }
  }

  function closeNewWalletModal() {
    if (!confirmedSaved) return; // force acknowledgment before closing
    setNewWallet(null);
  }

  const displayUsd = balance?.balanceUsd ?? "0.00";
  const displayEth = balance?.balance ? parseFloat(balance.balance).toFixed(6) : "0.000000";

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", flexShrink: 0 }}>
        <div style={{ textAlign: "center", paddingBottom: 12 }}>
          {activeAddress ? (
            <div style={{ fontSize: 11, color: T2, fontFamily: "monospace", marginBottom: 6 }}>
              {activeAddress.slice(0, 6)}…{activeAddress.slice(-4)} · Robinhood Chain
              {watchAddress && (
                <button
                  onClick={() => { setWatchAddress(""); setBalance(null); }}
                  style={{ marginLeft: 8, background: "none", border: "none", color: T2, fontSize: 11, cursor: "pointer" }}
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: T2, marginBottom: 6 }}>
              Not connected · Robinhood Chain
            </div>
          )}
          <div style={{ fontSize: 32, fontWeight: 800 }}>
            {loadingBalance ? "…" : `$${displayUsd}`}
          </div>
          <div style={{ fontSize: 13, color: T2, marginTop: 4 }}>
            {loadingBalance ? "…" : `${displayEth} ETH`}
          </div>
        </div>

        {status !== "connected" && (
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Connect Wallet</div>
            <div style={{ fontSize: 11, color: T2, marginBottom: 10 }}>
              Connect an existing wallet or create a new one to view your positions, PnL, and trade history.
            </div>

            <button
              onClick={connectExistingWallet}
              disabled={status === "connecting"}
              style={{
                display: "block", width: "100%", textAlign: "center", padding: 12, marginBottom: 8,
                background: G, color: "#000", borderRadius: 10, border: "none",
                fontSize: 13, fontWeight: 700, cursor: status === "connecting" ? "default" : "pointer",
                opacity: status === "connecting" ? 0.6 : 1,
              }}
            >
              {status === "connecting" ? "Connecting…" : "🦊 Connect Wallet"}
            </button>

            <button
              onClick={handleCreateWallet}
              disabled={creating}
              style={{
                display: "block", width: "100%", textAlign: "center", padding: 12, marginBottom: 10,
                background: "rgba(255,255,255,0.03)", color: "#f2f2f7", borderRadius: 10,
                border: `1px solid ${B}`,
                fontSize: 13, fontWeight: 700, cursor: creating ? "default" : "pointer",
                opacity: creating ? 0.6 : 1,
              }}
            >
              {creating ? "Creating…" : "✨ Create New Wallet"}
            </button>

            {error && <div style={{ fontSize: 10, color: R, marginBottom: 8 }}>{error}</div>}

            <div style={{ fontSize: 10, color: T3, textAlign: "center", marginBottom: 8 }}>or view any address</div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={inputAddr}
                onChange={e => setInputAddr(e.target.value)}
                placeholder="0x..."
                style={{
                  flex: 1, background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${B}`, borderRadius: 10,
                  padding: "9px 10px", fontSize: 11, color: "#f2f2f7",
                  outline: "none", fontFamily: "monospace",
                }}
              />
              <button
                onClick={() => setWatchAddress(inputAddr)}
                style={{
                  padding: "9px 14px", borderRadius: 10,
                  border: `1px solid ${B}`, background: "rgba(255,255,255,0.03)",
                  color: T2, fontSize: 11, fontWeight: 600, cursor: "pointer",
                }}
              >
                View
              </button>
            </div>
          </div>
        )}

        {activeAddress && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
              {[
                ["ETH Price", `$${balance?.ethPrice || "0"}`],
                ["Network", "Robinhood"],
                ["Chain ID", "4663"],
              ].map(([l, v]) => (
                <div key={l} style={{ background: S, border: `1px solid ${B}`, borderRadius: 10, padding: "8px" }}>
                  <div style={{ fontSize: 9, color: T3, textTransform: "uppercase", letterSpacing: ".05em" }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {["Deposit", "Send", "Receive", "Refresh"].map(a => (
                <button
                  key={a}
                  onClick={() => a === "Refresh" && fetchBalance(activeAddress)}
                  style={{
                    flex: 1, background: S, border: `1px solid ${B}`,
                    borderRadius: 10, padding: "8px 4px",
                    fontSize: 10, fontWeight: 600, color: T2, cursor: "pointer",
                  }}
                >{a}</button>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: 4, padding: "0 16px 8px", overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 100,
            border: `1px solid ${tab === t ? G : B}`,
            background: tab === t ? "rgba(0,200,5,0.12)" : "none",
            color: tab === t ? G : T2, cursor: "pointer", whiteSpace: "nowrap",
          }}>{t}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 100px", scrollbarWidth: "none" }}>
        {tab === "Holdings" && (
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💎</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>ETH Balance</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: G }}>
              {displayEth} ETH
            </div>
            <div style={{ fontSize: 13, color: T2, marginTop: 4 }}>
              ≈ ${displayUsd} USD
            </div>
            <div style={{ fontSize: 11, color: T3, marginTop: 8 }}>
              Token balances coming soon
            </div>
          </div>
        )}

        {tab === "PnL" && (
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>PnL Tracking</div>
            <div style={{ fontSize: 12, color: T2 }}>
              Connect your wallet and start trading to track your PnL
            </div>
          </div>
        )}

        {tab === "History" && (
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Transaction History</div>
            <div style={{ fontSize: 12, color: T2 }}>
              View your transactions on the Robinhood Chain explorer
            </div>
            {activeAddress && (
              <button
                onClick={() => window.open(`https://robinhoodchain.blockscout.com/address/${activeAddress}`, "_blank")}
                style={{
                  marginTop: 12, padding: "10px 20px", borderRadius: 10,
                  border: `1px solid ${G}`, background: "rgba(0,200,5,0.08)",
                  color: G, fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                View on Explorer
              </button>
            )}
          </div>
        )}

        {tab === "Wallets" && (
          <div>
            {activeAddress ? (
              <>
                <div style={{ background: S, border: `1px solid rgba(0,200,5,0.3)`, borderRadius: 14, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,200,5,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👛</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {status === "connected" ? "Connected Wallet" : "Viewing Wallet"} <span style={{ fontSize: 10, color: G }}>● Active</span>
                      </div>
                      <div style={{ fontSize: 11, color: T2, fontFamily: "monospace" }}>
                        {activeAddress.slice(0, 8)}…{activeAddress.slice(-6)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700 }}>${displayUsd}</div>
                  </div>
                </div>
                {status === "connected" && (
                  <button
                    onClick={() => { disconnect(); setWatchAddress(""); setBalance(null); }}
                    style={{
                      width: "100%", padding: 13, borderRadius: 12,
                      border: `1px solid ${B}`, background: S,
                      color: R, fontSize: 13, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Disconnect
                  </button>
                )}
              </>
            ) : (
              <div style={{ fontSize: 12, color: T2, textAlign: "center", padding: "30px 0" }}>
                No wallet connected yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reveal-once private key modal after creating a new wallet */}
      {newWallet && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16,
        }}>
          <div style={{ background: "#121214", border: `1px solid ${B}`, borderRadius: 14, padding: 18, maxWidth: 340, width: "100%" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: R, marginBottom: 8 }}>Save Your Private Key</div>
            <div style={{ fontSize: 11, color: T2, marginBottom: 10 }}>
              This is shown once. Anyone with this key controls your funds. Never share it.
            </div>
            <div style={{
              fontFamily: "monospace", fontSize: 11, background: "#000",
              border: `1px solid rgba(255,59,48,0.4)`, borderRadius: 8,
              padding: 10, wordBreak: "break-all", color: "#f2f2f7", marginBottom: 10,
            }}>
              {newWallet.privateKey}
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: T2, marginBottom: 12 }}>
              Address: {newWallet.address}
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#f2f2f7", marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={confirmedSaved}
                onChange={e => setConfirmedSaved(e.target.checked)}
              />
              I've saved my private key somewhere safe
            </label>
            <button
              onClick={closeNewWalletModal}
              disabled={!confirmedSaved}
              style={{
                width: "100%", padding: 11, borderRadius: 10, border: "none",
                background: confirmedSaved ? G : "rgba(0,200,5,0.3)", color: "#000",
                fontSize: 12, fontWeight: 700, cursor: confirmedSaved ? "pointer" : "default",
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
