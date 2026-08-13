"use client";
import { useState, useEffect } from "react";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

const TABS = ["Holdings", "PnL", "History", "Wallets"];

export default function PortfolioPage() {
  const [tab, setTab] = useState("Holdings");
  const [address, setAddress] = useState("");
  const [inputAddr, setInputAddr] = useState("");
  const [balance, setBalance] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function fetchBalance(addr: string) {
    if (!addr || addr.length !== 42) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/wallet/balance?address=${addr}`);
      const data = await res.json();
      setBalance(data);
      setAddress(addr);
    } catch {
      console.error("Failed to fetch balance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", flexShrink: 0 }}>
        {!address ? (
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>View Portfolio</div>
            <div style={{ fontSize: 12, color: T2, marginBottom: 12 }}>
              Enter any wallet address to view holdings on Robinhood Chain
            </div>
            <input
              value={inputAddr}
              onChange={e => setInputAddr(e.target.value)}
              placeholder="0x..."
              style={{
                width: "100%", background: "rgba(255,255,255,0.03)",
                border: `1px solid ${B}`, borderRadius: 10,
                padding: "10px 12px", fontSize: 12, color: "#f2f2f7",
                outline: "none", fontFamily: "monospace", marginBottom: 10,
              }}
            />
            <button
              onClick={() => fetchBalance(inputAddr)}
              disabled={loading}
              style={{
                width: "100%", padding: 12, borderRadius: 10,
                border: "none", background: G, color: "#000",
                fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              {loading ? "Loading…" : "View Portfolio"}
            </button>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: "center", paddingBottom: 12 }}>
              <div style={{ fontSize: 11, color: T2, fontFamily: "monospace", marginBottom: 6 }}>
                {address.slice(0, 6)}…{address.slice(-4)} · Robinhood Chain
                <button
                  onClick={() => { setAddress(""); setBalance(null); }}
                  style={{ marginLeft: 8, background: "none", border: "none", color: T2, fontSize: 11, cursor: "pointer" }}
                >✕</button>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>
                {loading ? "…" : `$${balance?.balanceUsd || "0.00"}`}
              </div>
              <div style={{ fontSize: 13, color: T2, marginTop: 4 }}>
                {balance?.balance ? `${parseFloat(balance.balance).toFixed(6)} ETH` : "0 ETH"}
              </div>
            </div>
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
                  onClick={() => a === "Refresh" && fetchBalance(address)}
                  style={{
                    flex: 1, background: S, border: `1px solid ${B}`,
                    borderRadius: 10, padding: "8px 4px",
                    fontSize: 10, fontWeight: 600, color: T2, cursor: "pointer",
                  }}
                >{a}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {address && (
        <>
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
                  {balance?.balance ? parseFloat(balance.balance).toFixed(6) : "0"} ETH
                </div>
                <div style={{ fontSize: 13, color: T2, marginTop: 4 }}>
                  ≈ ${balance?.balanceUsd || "0.00"} USD
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
                <div style={{ fontSize: 12, color: T2, marginBottom: 12 }}>
                  View your full transaction history on the explorer
                </div>
                <button
                  onClick={() => window.open(`https://robinhoodchain.blockscout.com/address/${address}`, "_blank")}
                  style={{
                    padding: "10px 20px", borderRadius: 10,
                    border: `1px solid ${G}`, background: "rgba(0,200,5,0.08)",
                    color: G, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  View on Explorer ↗
                </button>
              </div>
            )}

            {tab === "Wallets" && (
              <div>
                <div style={{ background: S, border: `1px solid rgba(0,200,5,0.3)`, borderRadius: 14, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(0,200,5,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👛</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        Wallet <span style={{ fontSize: 10, color: G }}>● Active</span>
                      </div>
                      <div style={{ fontSize: 11, color: T2, fontFamily: "monospace" }}>
                        {address.slice(0, 8)}…{address.slice(-6)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700 }}>${balance?.balanceUsd || "0"}</div>
                  </div>
                </div>
                <button
                  onClick={() => { setAddress(""); setBalance(null); }}
                  style={{
                    width: "100%", padding: 13, borderRadius: 12,
                    border: `1px solid ${B}`, background: S,
                    color: R, fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Disconnect Wallet
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
