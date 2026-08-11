"use client";
import { useState, useEffect } from "react";
import type { Token } from "../Terminal";

const G = "#00C805";
const R = "#FF3B30";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

type TxStatus = "idle" | "quoting" | "confirming" | "pending" | "success" | "error";

export default function TradePage({ token, side }: { token: Token | null; side: "buy" | "sell" }) {
  const [tab, setTab] = useState<"buy"|"sell"|"limit"|"multi">(side === "sell" ? "sell" : "buy");
  const [amount, setAmount] = useState("");
  const [pct, setPct] = useState<number | null>(null);
  const [slip, setSlip] = useState("0.5");
  const [gas, setGas] = useState("Fast");
  const [status, setStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState("");
  const [txError, setTxError] = useState("");
  const [quote, setQuote] = useState<any>(null);
  const [ethBalance, setEthBalance] = useState("0");
  const [tokenBalance, setTokenBalance] = useState("0");
  const [limitPrice, setLimitPrice] = useState("");

  const t = token || { name: "Select Token", ticker: "—", price: 0, change: 0, logo: "🪙", ca: "" };

  // Fetch quote when amount changes
  useEffect(() => {
    if (!amount || !t.ca || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }
    const timeout = setTimeout(async () => {
      setStatus("quoting");
      try {
        const res = await fetch(`/api/trade/quote?token=${t.ca}&amount=${amount}`);
        const data = await res.json();
        setQuote(data.quote);
        setEthBalance(data.ethBalance || "0");
        setTokenBalance(data.tokenBalance || "0");
      } catch {}
      setStatus("idle");
    }, 600);
    return () => clearTimeout(timeout);
  }, [amount, t.ca]);

  function handlePct(p: number, i: number) {
    setPct(i);
    if (tab === "buy") {
      const maxEth = parseFloat(ethBalance);
      setAmount(((maxEth * p) / 100).toFixed(4));
    } else {
      // sell: set percentage directly
      setAmount(p.toString());
    }
  }

  async function executeTrade() {
    if (!t.ca || !amount) return;
    setStatus("confirming");
  }

  async function confirmTrade() {
    setStatus("pending");
    try {
      const endpoint = tab === "buy" ? "/api/trade/buy" : "/api/trade/sell";
      const body = tab === "buy"
        ? { tokenAddress: t.ca, amountEth: amount, slippage: slip }
        : { tokenAddress: t.ca, percentage: parseInt(amount), slippage: slip };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        setTxHash(data.hash || "");
        setStatus("success");
      } else {
        setTxError(data.error || "Transaction failed");
        setStatus("error");
      }
    } catch (err: any) {
      setTxError(err.message);
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setAmount("");
    setPct(null);
    setTxHash("");
    setTxError("");
    setQuote(null);
  }

  const estimatedOutput = quote
    ? (parseFloat(ethers_formatUnits(quote.tokenAmount)) / 1).toFixed(0)
    : "—";

  function ethers_formatUnits(wei: string): string {
    try {
      const n = BigInt(wei);
      return (Number(n) / 1e18).toFixed(6);
    } catch { return "0"; }
  }

  // Success screen
  if (status === "success") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
        <div style={{ fontSize: 64 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Transaction Sent!</div>
        <div style={{ fontSize: 13, color: T2, textAlign: "center" }}>
          Your {tab === "buy" ? "buy" : "sell"} order has been submitted to Robinhood Chain.
        </div>
        {txHash && (
          <button
            onClick={() => window.open(`https://explorer.robinhood.com/tx/${txHash}`, "_blank")}
            style={{ background: S, border: `1px solid ${B}`, borderRadius: 12, padding: "10px 20px", color: T2, cursor: "pointer", fontSize: 12 }}
          >
            🔍 View on Explorer
          </button>
        )}
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <button onClick={reset} style={{ flex: 1, padding: 14, borderRadius: 12, border: "none", background: G, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Trade Again
          </button>
        </div>
      </div>
    );
  }

  // Error screen
  if (status === "error") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
        <div style={{ fontSize: 64 }}>❌</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Transaction Failed</div>
        <div style={{ fontSize: 13, color: R, textAlign: "center", background: "rgba(255,59,48,0.1)", padding: 12, borderRadius: 10, width: "100%" }}>
          {txError}
        </div>
        <button onClick={reset} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: S, color: "#f2f2f7", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Try Again
        </button>
      </div>
    );
  }

  // Confirm screen
  if (status === "confirming") {
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 100px", scrollbarWidth: "none" }}>
        <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16, textAlign: "center" }}>
            Confirm {tab === "buy" ? "🟢 Buy" : "🔴 Sell"}
          </div>
          {[
            ["Token", `${t.name} (${t.ticker})`],
            [tab === "buy" ? "Spending" : "Selling", tab === "buy" ? `${amount} ETH` : `${amount}% of balance`],
            ["Est. Received", tab === "buy" ? `~${parseInt(estimatedOutput).toLocaleString()} ${t.ticker}` : "~ETH"],
            ["Slippage", `${slip}%`],
            ["Gas Priority", gas],
            ["Network", "Robinhood Chain"],
          ].map(([l, v]) => (
            <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
              <span style={{ fontSize: 13, color: T2 }}>{l}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(255,200,0,0.08)", border: "1px solid rgba(255,200,0,0.2)", borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 12, color: "#FFD60A" }}>
          ⚠️ You are about to sign a real transaction on Robinhood Chain. This cannot be undone.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={reset} style={{ padding: 14, borderRadius: 12, border: `1px solid ${B}`, background: S, color: "#f2f2f7", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={confirmTrade} style={{ padding: 14, borderRadius: 12, border: "none", background: tab === "buy" ? G : R, color: tab === "buy" ? "#000" : "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Confirm
          </button>
        </div>
      </div>
    );
  }

  // Pending screen
  if (status === "pending") {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", border: `3px solid ${G}`, borderTopColor: "transparent", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Broadcasting Transaction</div>
        <div style={{ fontSize: 13, color: T2 }}>Confirming on Robinhood Chain…</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 100px", scrollbarWidth: "none" }}>
      {/* Token info */}
      <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(0,200,5,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
          {t.logo || t.ticker?.[0] || "🪙"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
          <div style={{ fontSize: 12, color: T2 }}>{t.ticker} · Robinhood Chain</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            ${t.price < 0.001 ? t.price.toExponential(2) : t.price.toFixed(6)}
          </div>
          <div style={{ fontSize: 11, color: t.change >= 0 ? G : R, fontWeight: 600 }}>
            {t.change >= 0 ? "+" : ""}{t.change?.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: S, border: `1px solid ${B}`, borderRadius: 12, padding: 3, marginBottom: 10 }}>
        {(["buy","sell","limit","multi"] as const).map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{
            flex: 1, padding: "7px", borderRadius: 9, border: "none",
            background: tab === tb
              ? tb === "sell" ? R : tb === "buy" ? G : "rgba(255,255,255,0.08)"
              : "none",
            color: tab === tb
              ? tb === "sell" ? "#fff" : tb === "buy" ? "#000" : "#f2f2f7"
              : T2,
            fontWeight: 700, fontSize: 11, cursor: "pointer", textTransform: "capitalize",
          }}>{tb}</button>
        ))}
      </div>

      {/* Balance */}
      {(tab === "buy" || tab === "sell") && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 4px", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: T2 }}>
            {tab === "buy" ? `Balance: ${parseFloat(ethBalance).toFixed(4)} ETH` : `Balance: ${parseFloat(tokenBalance).toLocaleString()} ${t.ticker}`}
          </span>
          <span style={{ fontSize: 11, color: T3 }}>Robinhood Chain</span>
        </div>
      )}

      {/* Buy / Sell */}
      {(tab === "buy" || tab === "sell") && (
        <>
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={e => { setAmount(e.target.value); setPct(null); }}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${B}`, borderRadius: 12,
                  padding: "12px 60px 12px 14px",
                  fontSize: 22, fontWeight: 700, color: "#f2f2f7", outline: "none",
                }}
              />
              <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 600, color: T2 }}>
                {tab === "buy" ? "ETH" : "%"}
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
              {(tab === "buy"
                ? [{ label: "10%", val: 10 }, { label: "25%", val: 25 }, { label: "50%", val: 50 }, { label: "MAX", val: 100 }]
                : [{ label: "25%", val: 25 }, { label: "50%", val: 50 }, { label: "75%", val: 75 }, { label: "MAX", val: 100 }]
              ).map(({ label, val }, i) => (
                <button key={label} onClick={() => handlePct(val, i)} style={{
                  padding: "8px", borderRadius: 9,
                  border: `1px solid ${pct === i ? (tab === "buy" ? G : R) : B}`,
                  background: pct === i ? (tab === "buy" ? "rgba(0,200,5,0.12)" : "rgba(255,59,48,0.12)") : "rgba(255,255,255,0.03)",
                  fontSize: 12, fontWeight: 700,
                  color: pct === i ? (tab === "buy" ? G : R) : T2,
                  cursor: "pointer",
                }}>{label}</button>
              ))}
            </div>

            {/* Quote */}
            {[
              ["Estimated Received", status === "quoting" ? "…" : tab === "buy" ? `~${parseInt(estimatedOutput || "0").toLocaleString()} ${t.ticker}` : "~ETH"],
              ["Price Impact", "< 0.5%"],
              ["Slippage", `${slip}%`],
              ["Gas", "~$0.05-0.15"],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <span style={{ fontSize: 12, color: T2 }}>{l}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Settings */}
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 12, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: T2 }}>Slippage</span>
              <div style={{ display: "flex", gap: 5 }}>
                {["0.1","0.5","1.0","2.0"].map(s => (
                  <button key={s} onClick={() => setSlip(s)} style={{
                    padding: "3px 8px", borderRadius: 7,
                    border: `1px solid ${slip === s ? G : B}`,
                    background: slip === s ? "rgba(0,200,5,0.12)" : "none",
                    fontSize: 10, fontWeight: 700, color: slip === s ? G : T2, cursor: "pointer",
                  }}>{s}%</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: T2 }}>Gas Priority</span>
              <div style={{ display: "flex", gap: 5 }}>
                {["Normal","Fast","Turbo"].map(g => (
                  <button key={g} onClick={() => setGas(g)} style={{
                    padding: "3px 8px", borderRadius: 7,
                    border: `1px solid ${gas === g ? G : B}`,
                    background: gas === g ? "rgba(0,200,5,0.12)" : "none",
                    fontSize: 10, fontWeight: 700, color: gas === g ? G : T2, cursor: "pointer",
                  }}>{g}</button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={executeTrade}
            disabled={!amount || parseFloat(amount) <= 0}
            style={{
              width: "100%", padding: 15, borderRadius: 13, border: "none",
              background: !amount || parseFloat(amount) <= 0
                ? "rgba(255,255,255,0.08)"
                : tab === "buy" ? G : R,
              color: tab === "buy" ? "#000" : "#fff",
              fontSize: 15, fontWeight: 800, cursor: "pointer",
              opacity: !amount || parseFloat(amount) <= 0 ? 0.5 : 1,
            }}
          >
            {tab === "buy" ? `Buy ${t.ticker}` : `Sell ${t.ticker}`}
          </button>
        </>
      )}

      {/* Limit */}
      {tab === "limit" && (
        <>
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: T2, marginBottom: 6 }}>Target Price (USD)</div>
            <input type="number" placeholder={`Current: $${t.price.toFixed(6)}`} value={limitPrice} onChange={e => setLimitPrice(e.target.value)}
              style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: `1px solid ${B}`, borderRadius: 12, padding: "12px 14px", fontSize: 18, fontWeight: 700, color: "#f2f2f7", outline: "none", marginBottom: 10 }}
            />
            <div style={{ fontSize: 11, color: T2, marginBottom: 6 }}>Amount</div>
            <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
              style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: `1px solid ${B}`, borderRadius: 12, padding: "12px 14px", fontSize: 18, fontWeight: 700, color: "#f2f2f7", outline: "none" }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button style={{ padding: 14, borderRadius: 12, border: "none", background: G, color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>🟢 Buy Limit</button>
            <button style={{ padding: 14, borderRadius: 12, border: "none", background: R, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>🔴 Sell Limit</button>
          </div>
        </>
      )}

      {/* Multi */}
      {tab === "multi" && (
        <>
          <div style={{ background: "rgba(255,200,0,0.08)", border: "1px solid rgba(255,200,0,0.2)", borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 12, color: "#FFD60A" }}>
            👥 Multi-wallet buy lets you buy the same token from multiple wallets simultaneously.
          </div>
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: T2, marginBottom: 10 }}>Amount per wallet (ETH)</div>
            <input type="number" placeholder="0.05" value={amount} onChange={e => setAmount(e.target.value)}
              style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: `1px solid ${B}`, borderRadius: 12, padding: "12px 14px", fontSize: 18, fontWeight: 700, color: "#f2f2f7", outline: "none" }}
            />
          </div>
          <button style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: G, color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
            Buy with All Wallets
          </button>
        </>
      )}
    </div>
  );
}
