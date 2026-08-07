import type { Page } from "../Terminal";

const ITEMS = [
  { id: "discover", icon: "🏠", label: "Discover" },
  { id: "trade", icon: "⚡", label: "Trade" },
  { id: "portfolio", icon: "💼", label: "Portfolio" },
  { id: "alerts", icon: "🔔", label: "Alerts" },
  { id: "settings", icon: "⚙️", label: "Settings" },
] as const;

export default function BottomNav({ current, onChange }: { current: Page; onChange: (p: Page) => void }) {
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(10,10,11,0.92)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", padding: "8px 8px" }}>
      {ITEMS.map(n => (
        <button key={n.id} onClick={() => onChange(n.id as Page)}
          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "6px 4px", borderRadius: 10, cursor: "pointer", border: "none", background: "none" }}>
          <span style={{ fontSize: 20 }}>{n.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 500, color: current === n.id ? "#00C805" : "#48484a" }}>{n.label}</span>
        </button>
      ))}
    </div>
  );
}
