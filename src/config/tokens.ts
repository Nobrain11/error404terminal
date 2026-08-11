// src/config/tokens.ts

export const DEFAULT_TOKEN = {
  address: "0x4699902aEF95196e4Bceb6472EB131A2c18206fA",
  symbol: "ERROR",
  name: "ERROR404",
} as const;

// Symbol/name above are for display fallback only (e.g. before on-chain
// data loads). Always prefer the live decimals()/symbol() call in
// swapV2.ts's getBuyQuote/getSellQuote as the source of truth.
