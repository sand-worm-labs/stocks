// What the market endpoints answer, shaped as the web app uses them. The web app's own types (apps/web/src/lib/markets) are these, one for one.

// A tokenized stock on Base, from CoinGecko
export type BaseToken = {
  id: string;
  symbol: string;
  company: string;
  issuer: string;
  image?: string;
  address: string;
  price: number;
  marketCap?: number;
  volume?: number;
  rank: number;
  // As fractions: 0.012 is +1.2%
  change1h?: number;
  change24h?: number;
  change7d?: number;
  series: number[];
};

// What a token's deepest pool on Base says right now. Changes are in percent, as the feed gives them.
export type PoolQuote = {
  // The token's contract, lowercase
  address: string;
  pair: string;
  quote: string;
  price: number;
  change5m?: number;
  change1h?: number;
  change24h?: number;
  volume24h?: number;
  liquidity?: number;
};

// A share's price and how it has moved over the month, oldest close first
export type Quote = { price: number; name?: string; monthChange?: number; dayChange?: number; series: number[] };

// A price at a moment, `time` in seconds
export type PricePoint = { time: number; price: number };

export type HistoryWindow = 'day' | 'week' | 'month';

// Daily closing prices, the same days for every ticker, oldest first
export type DailyPrices = { dates: string[]; closes: Record<string, number[]> };

// A company Yahoo's search found for a ticker
export type SearchHit = { symbol: string; name: string; isEquity: boolean; exchange?: string; sector?: string; industry?: string };
