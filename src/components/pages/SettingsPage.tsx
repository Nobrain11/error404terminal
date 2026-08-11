"use client";
import { useState, useEffect } from "react";

// ... keep your existing G, S, B, T2, T3 constants and NotifItem interface ...

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

  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  async function handleAddWallet() {
    setLoadingWallet(true);
    setWalletError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setWalletError("Not logged in");
        setLoadingWallet(false);
        return;
      }
      const res = await fetch("/api/wallet/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: "Wallet 1" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWalletError(data.error || "Failed to create wallet");
      } else {
        setWalletAddress(data.address);
      }
    } catch (err) {
      setWalletError("Network error");
    } finally {
      setLoadingWallet(false);
    }
  }

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
          <div style={{ display: "flex", alignItems: "center", padding: "13px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ flex: 1, fontSize: 13 }}>Active Wallet</span>
            <span style={{ fontSize: 13, color: T2, marginRight: 6 }}>
              {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "None"}
            </span>
          </div>
          <div
            onClick={handleAddWallet}
            style={{ display: "flex", alignItems: "center", padding: "13px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", opacity: loadingWallet ? 0.5 : 1 }}
          >
            <span style={{ flex: 1, fontSize: 13 }}>
              {loadingWallet ? "Creating…" : "Add Wallet"}
            </span>
            <span style={{ color: T3, fontSize: 12 }}>›</span>
          </div>
          {walletError && (
            <div style={{ padding: "8px 14px", fontSize: 12, color: "#ff453a" }}>{walletError}</div>
          )}
          {[
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

      {/* keep the rest of your file (Trading, Notifications, Security, App sections) unchanged */}
