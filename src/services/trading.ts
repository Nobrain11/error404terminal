// ─────────────────────────────────────────────────────────────────────────────
// Uniswap V4 quote types
// ─────────────────────────────────────────────────────────────────────────────

type V4BuyQuote = {
  tokensOut: bigint;
  fee: bigint;
};

type V4SellQuote = {
  ethOut: bigint;
  fee: bigint;
};

// ─────────────────────────────────────────────────────────────────────────────
// V4 BUY QUOTE
// ─────────────────────────────────────────────────────────────────────────────
//
// Graduated-token routing is intentionally fail-closed until the exact
// Robinhood Chain V4 Quoter encoding has been verified.
//
// IMPORTANT:
// Do not return fake values such as 0n here. A fake quote can cause the UI
// and trading logic to display an executable price that is not real.
// ─────────────────────────────────────────────────────────────────────────────

async function getV4BuyQuote(
  _state: TokenState,
  _amountIn: bigint,
): Promise<V4BuyQuote> {
  throw new Error(
    "Graduated-token V4 buy quotes are not enabled yet",
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// V4 SELL QUOTE
// ─────────────────────────────────────────────────────────────────────────────

async function getV4SellQuote(
  _state: TokenState,
  _amountIn: bigint,
): Promise<V4SellQuote> {
  throw new Error(
    "Graduated-token V4 sell quotes are not enabled yet",
  );
}
