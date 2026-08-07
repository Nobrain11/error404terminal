const SECTIONS = [
  { label: "Wallet", rows: [{ label: "Address", val: "0x3a7f…9b44" }, { label: "Export Private Key", val: "" }, { label: "Recovery Phrase", val: "" }] },
  { label: "Trading", rows: [{ label: "Default Slippage", val: "0.5%" }, { label: "Gas Priority", val: "Fast" }, { label: "Expert Mode", val: "Off" }] },
  { label: "Notifications", rows: [{ label: "Price Alerts", val: "On" }, { label: "Whale Activity", val: "On" }, { label: "Trade Confirmations", val: "On" }] },
  { label: "App", rows: [{ label: "Language", val: "English" }, { label: "Theme", val: "Dark" }, { label: "Version", val: "1.0.0" }] },
];

export default function SettingsPage() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "8px 0 100px" }}>
      {SECTIONS.map(s => (
        <div key={s.label} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#48484a", textTransform: "uppercase", letterSpacing: ".06em", padding: "0 18px", marginBottom: 8 }}>{s.label}</div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden", margin: "0 18px" }}>
            {s.rows.map(r => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer" }}>
                <span style={{ flex: 1, fontSize: 14 }}>{r.label}</span>
                {r.val && <span style={{ fontSize: 14, color: "#8e8e93", marginRight: 8 }}>{r.val}</span>}
                <span style={{ color: "#48484a", fontSize: 12 }}>›</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
