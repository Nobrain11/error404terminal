"use client";
import { useState } from "react";

const G = "#00C805";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

export default function ScannerPage() {
  const [ca, setCa] = useState("");
  const [tab, setTab] = useState("Quick");
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  function scan() {
    if (!ca) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setScanned(true); }, 1200);
  }

  const TABS = ["Quick", "Full Audit", "Holders", "Contract", "Dev"];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 100px", scrollbarWidth: "none" }}>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <input
          value={ca}
          onChange={e => setCa(e.target.value)}
          placeholder="Paste contract address…"
          style={{
            width: "100%", background: S, border: `1px solid ${B}`,
            borderRadius: 12, padding: "11px 80px 11px 14px",
            fontSize: 13, color: "#f2f2f7", outline: "none",
            fontFamily: "monospace",
          }}
        />
        <button onClick={scan} style={{
          position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
          background: G, border: "none", borderRadius: 9, padding: "6px 14px",
          fontSize: 12, fontWeight: 700, color: "#000", cursor: "pointer",
        }}>
          {loading ? "…" : "Scan"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 100,
            border: `1px solid ${tab === t ? G : B}`,
            background: tab === t ? "rgba(0,200,5,0.12)" : "none",
            color: tab === t ? G : T2, cursor: "pointer", whiteSpace: "nowrap",
          }}>{t}</button>
        ))}
      </div>

      {!scanned && !loading && (
        <div style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🛡</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Contract Scanner</div>
          <div style={{ fontSize: 13, color: T2 }}>Paste any contract address above to run a full audit instantly.</div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 13, color: T2 }}>Scanning…</div>
        </div>
      )}

      {scanned && (
        <>
          {/* Score */}
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Safety Score</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: G }}>82/100</span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 100, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", width: "82%", background: `linear-gradient(90deg, ${G}, #a8ff38)`, borderRadius: 100 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                ["✅", "Verified Contract"],
                ["✅", "Ownership Renounced"],
                ["✅", "Liquidity Healthy"],
                ["✅", "No Honeypot"],
                ["⚠️", "Fresh Wallets: 12%"],
                ["✅", "Tax: 0% / 0%"],
              ].map(([icon, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T2 }}>
                  <span>{icon}</span><span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Market */}
          <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T2, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>Market Data</div>
            {[
              ["Price", "$0.004821"],
              ["Market Cap", "$4.8M"],
              ["Liquidity", "$1.2M"],
              ["Volume 24H", "$890K"],
              ["Holders", "3,420"],
              ["Age", "2 days"],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <span style={{ fontSize: 12, color: T2 }}>{l}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Holders */}
          {(tab === "Holders" || tab === "Full Audit") && (
            <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T2, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>Top Holders</div>
              {[
                ["🏦 Liquidity Pool", "48.2%", G],
                ["👨‍💻 Dev Wallet", "3.1%", "#FFD60A"],
                ["🔥 Burn", "5.0%", G],
                ["0x9b…c44", "2.8%", G],
                ["0x11…ee2", "1.9%", G],
                ["Others", "39.0%", T3],
              ].map(([w, p, c]) => (
                <div key={w} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: T2 }}>{w}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 60, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 100, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: p, background: c, borderRadius: 100 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: c, minWidth: 36, textAlign: "right" }}>{p}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contract */}
          {(tab === "Contract" || tab === "Full Audit") && (
            <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T2, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>Contract Info</div>
              {[
                ["Standard", "ERC-20"],
                ["Decimals", "18"],
                ["Supply", "1,000,000,000"],
                ["Verified", "Yes ✓"],
                ["Proxy", "No"],
                ["Mintable", "No"],
                ["Pausable", "No"],
                ["Liq. Lock", "180 days"],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <span style={{ fontSize: 12, color: T2 }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Dev */}
          {(tab === "Dev" || tab === "Full Audit") && (
            <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T2, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>Developer Analysis</div>
              {[
                ["Dev Wallet", "0x9b2e…f44c"],
                ["Dev Holdings", "3.1%"],
                ["Sold %", "0%"],
                ["Other Deploys", "2"],
                ["Rugged Before", "No ✅"],
                ["Last Activity", "2h ago"],
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                  <span style={{ fontSize: 12, color: T2 }}>{l}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => onTrade} style={{
            width: "100%", padding: 14, borderRadius: 12, border: "none",
            background: G, color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer",
          }}>
            🟢 Buy This Token
          </button>
        </>
      )}
    </div>
  );
}
