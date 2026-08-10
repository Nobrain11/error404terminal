"use client";
import { useState } from "react";

const G = "#00C805";
const S = "rgba(255,255,255,0.04)";
const B = "rgba(255,255,255,0.08)";
const T2 = "#8e8e93";
const T3 = "#48484a";

interface NotifItem {
  label: string;
  active: boolean;
}

export default function SettingsPage() {
  const [slip, setSlip] = useState("0.5");
  const [gas, setGas] = useState("Fast");
  const [rpc, setRpc] = useState("https://rpc.robinhoodchain.com");
  const [notifs, setNotifs] = useState<NotifItem[]>([
    { label: "Price Alerts", active: true },
    { label: "Whale Activity", active: true },
    { label: "Trade Confirmations", active: true },
    { label: "Portfolio Summary", active: false },
    { label: "New Listings", active: true },
  ]);

  function toggleNotif(i: number) {
    setNotifs((n) =>
      n.map((item, j) => (j === i ? { ...item, active: !item.active } : item))
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 100px", scrollbarWidth: "none" }}>

      {/* Wallets */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: "uppercase", letterSpacing: ".07em", padding: "0 18px", marginBottom: 8 }}>
          Wallets
        </div>
        <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, overflow: "hidden", margin: "0 16px" }}>
          {[
            { label: "Active Wallet", val: "0x3a7f…9b44" },
            { label: "Add Wallet", val: "" },
            { label: "Export Private Key", val: "" },
            { label: "Recovery Phrase", val: "" },
          ].map((r, i, arr) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", padding: "13px 14px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", cursor: "pointer" }}>
              <span style={{ flex: 1, fontSize: 13 }}>{r.label}</span>
              {r.val && <span style={{ fontSize: 13, color: T2, marginRight: 6 }}>{r.val}</span>}
              <span style={{ color: T3, fontSize: 12 }}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trading */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: "uppercase", letterSpacing: ".07em", padding: "0 18px", marginBottom: 8 }}>
          Trading
        </div>
        <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, overflow: "hidden", margin: "0 16px" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 12, color: T2, marginBottom: 8 }}>Slippage</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["0.1", "0.5", "1.0", "2.0"].map((s) => (
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
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 12, color: T2, marginBottom: 8 }}>Gas Priority</div>
            <div style={{ display: "flex", gap: 6 }}>
              {["Normal", "Fast", "Turbo"].map((g) => (
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
            <input
              value={rpc}
              onChange={(e) => setRpc(e.target.value)}
              style={{
                width: "100%", background: "rgba(255,255,255,0.03)",
                border: `1px solid ${B}`, borderRadius: 9,
                padding: "8px 10px", fontSize: 11, color: "#f2f2f7",
                outline: "none", fontFamily: "monospace",
              }}
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: "uppercase", letterSpacing: ".07em", padding: "0 18px", marginBottom: 8 }}>
          Notifications
        </div>
        <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, overflow: "hidden", margin: "0 16px" }}>
          {notifs.map((n, i) => (
            <div key={n.label} style={{ display: "flex", alignItems: "center", padding: "13px 14px", borderBottom: i < notifs.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
              <span style={{ flex: 1, fontSize: 13 }}>{n.label}</span>
              <div
                onClick={() => toggleNotif(i)}
                style={{
                  width: 40, height: 22, borderRadius: 100,
                  background: n.active ? G : T3,
                  position: "relative", cursor: "pointer",
                  transition: "background .2s",
                }}
              >
                <div style={{
                  position: "absolute", width: 16, height: 16,
                  background: "#fff", borderRadius: "50%",
                  top: 3, left: n.active ? 21 : 3,
                  transition: "left .2s",
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: "uppercase", letterSpacing: ".07em", padding: "0 18px", marginBottom: 8 }}>
          Security
        </div>
        <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, overflow: "hidden", margin: "0 16px" }}>
          {[
            { label: "PIN Protection", val: "Off" },
            { label: "Biometrics", val: "Off" },
            { label: "Session Timeout", val: "30m" },
            { label: "Transaction Confirm", val: "On" },
          ].map((r, i, arr) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", padding: "13px 14px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", cursor: "pointer" }}>
              <span style={{ flex: 1, fontSize: 13 }}>{r.label}</span>
              <span style={{ fontSize: 13, color: T2, marginRight: 6 }}>{r.val}</span>
              <span style={{ color: T3, fontSize: 12 }}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* App */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T3, textTransform: "uppercase", letterSpacing: ".07em", padding: "0 18px", marginBottom: 8 }}>
          App
        </div>
        <div style={{ background: S, border: `1px solid ${B}`, borderRadius: 14, overflow: "hidden", margin: "0 16px" }}>
          {[
            { label: "Language", val: "English" },
            { label: "Theme", val: "Dark" },
            { label: "Referral Code", val: "E404-XYZ123" },
            { label: "Version", val: "1.0.0" },
          ].map((r, i, arr) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", padding: "13px 14px", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", cursor: "pointer" }}>
              <span style={{ flex: 1, fontSize: 13 }}>{r.label}</span>
              <span style={{ fontSize: 13, color: T2, marginRight: 6 }}>{r.val}</span>
              <span style={{ color: T3, fontSize: 12 }}>›</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
