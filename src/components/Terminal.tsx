"use client";
import { useState } from "react";
import DiscoverPage from "./pages/DiscoverPage";
import TradePage from "./pages/TradePage";
import ScannerPage from "./pages/ScannerPage";
import PortfolioPage from "./pages/PortfolioPage";
import OrdersPage from "./pages/OrdersPage";
import TrackingPage from "./pages/TrackingPage";
import ReferralPage from "./pages/ReferralPage";
import SettingsPage from "./pages/SettingsPage";
import BottomNav from "./ui/BottomNav";
import Header from "./ui/Header";
import TickerTape from "./ui/TickerTape";
import RobinBot from "./ui/RobinBot";
import TokenDetail from "./pages/TokenDetail";

export type Page =
  | "discover"
  | "trade"
  | "scanner"
  | "portfolio"
  | "orders"
  | "tracking"
  | "referral"
  | "settings";

export interface Token {
  id: number;
  name: string;
  ticker: string;
  price: number;
  change: number;
  mcap: string;
  liq: string;
  vol: string;
  age: string;
  holders: number;
  verified: boolean;
  logo: string;
  ca: string;
  pairAddress?: string;
}

export default function Terminal() {
  const [page, setPage] = useState<Page>("discover");
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [tradeToken, setTradeToken] = useState<Token | null>(null);
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");

  function handleSelectToken(token: Token) {
    setSelectedToken(token);
  }

  function handleTrade(token: Token, side: "buy" | "sell") {
    setTradeToken(token);
    setTradeSide(side);
    setSelectedToken(null);
    setPage("trade");
  }

  function handleBack() {
    setSelectedToken(null);
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      background: "#0a0a0b",
      maxWidth: 430,
      margin: "0 auto",
      position: "relative",
      overflow: "hidden",
    }}>
      <TickerTape />
      <Header page={page} />

      {selectedToken ? (
        <TokenDetail
          token={selectedToken}
          onBack={handleBack}
          onTrade={handleTrade}
        />
      ) : (
        <>
          {page === "discover" && <DiscoverPage onSelectToken={handleSelectToken} />}
          {page === "trade" && <TradePage token={tradeToken} side={tradeSide} />}
          {page === "scanner" && <ScannerPage />}
          {page === "portfolio" && <PortfolioPage />}
          {page === "orders" && <OrdersPage />}
          {page === "tracking" && <TrackingPage />}
          {page === "referral" && <ReferralPage />}
          {page === "settings" && <SettingsPage />}
        </>
      )}

      <RobinBot />
      <BottomNav current={page} onChange={(p) => { setPage(p); setSelectedToken(null); }} />
    </div>
  );
}
