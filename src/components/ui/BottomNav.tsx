import type { Page } from "../Terminal";

const ITEMS = [
  { id: "discover", icon: "🔥", label: "Discover" },
  { id: "trade", icon: "⚡", label: "Trade" },
  { id: "scanner", icon: "🛡", label: "Scanner" },
  { id: "portfolio", icon: "💼", label: "Portfolio" },
  { id: "orders", icon: "📊", label: "Orders" },
] as const;

const MORE = [
  { id: "tracking", icon: "⭐", label: "Tracking" },
  { id: "referral", icon: "👥", label: "Referral" },
  { id: "settings", icon: "⚙️", label: "Settings" },
] as const;

export default function BottomNav({
  current,
  onChange,
}: {
  current: Page;
  onChange: (p: Page) => void;
}) {
  const allItems = [...ITEMS, ...MORE];

  return (
    <div style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      background: "rgba(10,10,11,0.96)",
      backdropFilter: "blur(20px)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      padding: "6px 4px 8px",
      zIndex: 100,
      overflowX: "auto",
      scrollbarWidth: "none",
    }}>
      {allItems.map((n) => (
        <button
          key={n.id}
          onClick={() => onChange(n.id as Page)}
          style={{
            flex: "0 0 auto",
            minWidth: 52,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            padding: "4px 6px",
            borderRadius: 10,
            cursor: "pointer",
            border: "none",
            background: current === n.id ? "rgba(0,200,5,0.1)" : "none",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>{n.icon}</span>
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            color: current === n.id ? "#00C805" : "#48484a",
            whiteSpace: "nowrap",
          }}>
            {n.label}
          </span>
        </button>
      ))}
    </div>
  );
}
