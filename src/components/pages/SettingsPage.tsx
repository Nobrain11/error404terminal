"use client";
import { useState } from "react";

const G = "#00C805";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

export default function SettingsPage() {
  const [slip, setSlip] = useState("0.5");
  const [gas, setGas] = useState("Fast");
  const [rpc, setRpc] = useState("https://rpc.robinhoodchain.com");
  const [notifs, setNotifs] = useState(true);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 100px", scrollbarWidth: "none" }}>
      {[
        {
          label: "Wallets",
          rows: [
            { label: "Active Wallet", val: "0x3a7f…9b44" },
            { label: "Add Wallet", val: "" },
            { label: "Export Private Key", val: "" },
            { label: "Recovery Phrase", val: "" },
          ],
        },
        {
          label: "Trading",
          custom: (
            <div style={{ padding: "0 16px" }}>
              <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "12px 14px", borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                  <div style={{ fontSize: 12, color: T2, marginBottom: 8 }}>Slippage</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["0.1", "0.5", "1.0", "2.0"].map(s => (
                      <button key={s} onClick={() => setSlip(s)} style={{
                        flex: 1, padding: "7px", borderRadius: 9,
                        border: `1px solid ${slip === s ? G : B}`,
                        background: slip === s ? "rgba(0,200,5,0.12)" : "rgba(255,255,255,0.03)",
                        fontSize: 11, fontWeight: 700,
                        color: slip === s ? G : T2, cursor: "pointer",
                      }}>{s}%</button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "12px 14px", borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
                  <div style={{ fontSize: 12, color: T2, marginBottom: 8 }}>Gas Priority</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["Normal", "Fast", "Turbo"].map(g => (
                      <button key={g} onClick={() => setGas(g)} style={{
                        flex: 1, padding: "7px", borderRadius: 9,
                        border: `1px solid ${gas === g ? G : B}`,
                        background: gas === g ? "rgba(0,200,5,0.12)" : "rgba(255,255,255,0.03)",
                        fontSize: 11, fontWeight: 700,
                        color: gas === g ? G : T2, cursor: "pointer",
                      }}>{g}</button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ fontSize: 12, color: T2, marginBottom: 6 }}>RPC Endpoint</div>
                  <input value={rpc} onChange={e => setRpc(e.target.value)} style={{
                    width: "100%", background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${B}`, borderRadius: 9,
                    padding: "8px 10px", fontSize: 11, color: "#f2f2f7",
                    outline: "none", fontFamily: "monospace",
                  }} />
                </div>
              </div>
            </div>
          ),
        },
        {
          label: "Notifications",
          custom: (
            <div style={{ padding: "0 16px" }}>
              <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, overflow: "hidden" }}>
                {[
                  ["Price Alerts", true],
                  ["Whale Activity", true],
                  ["Trade Confirmations", true],
                  ["Portfolio Summary", false],
                  ["New Listings", true],
                ].map(([label, def], i) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", padding: "13px 14px", borderBottom: i < 4 ? `1px solid rgba(255,255,255,0.06)` : "none" }}>
                    <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
                    <div style={{ width: 40, height: 22, borderRadius: 100, background: def ? G : T3, position: "relative", cursor: "pointer" }}>
                      <div style={{ position: "absolute", width: 16, height: 16, background: "#fff", borderRadius: "50%", top: 3, left: def ? 21 : 3, transition: "left .2s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ),
        },
        {
          label: "Security",
          rows: [
            { label: "PIN Protection", val: "Off" },
            { label: "Biometrics", val: "Off" },
            { label: "Session Timeout", val: "30m" },
            { label: "Transaction Confirm", val: "On" },
          ],
        },
        {
          label: "App",
          rows: [
            { label: "Language", val: "English" },
            { label: "Theme", val: "Dark" },
            { label: "Referral Code", val: "E404-XYZ123" },
            { label: "Version", val: "1.0.0" },
          ],
        },
      ].map(section => (
        <div key={section.label} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: "uppercase", letterSpacing: ".07em", padding: "0 18px", marginBottom: 8 }}>
            {section.label}
          </div>
          {section.custom ? section.custom : (
            <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, overflow: "hidden", margin: "0 16px" }}>
              {section.rows?.map((r, i) => (
                <div key={r.label} style={{ display: "flex", alignItems: "center", padding: "13px 14px", borderBottom: i < section.rows!.length - 1 ? `1px solid rgba(255,255,255,0.06)` : "none", cursor: "pointer" }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{r.label}</span>
                  {r.val && <span style={{ fontSize: 13, color: T2, marginRight: 6 }}>{r.val}</span>}
                  <span style={{ color: T3, fontSize: 12 }}>›</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
