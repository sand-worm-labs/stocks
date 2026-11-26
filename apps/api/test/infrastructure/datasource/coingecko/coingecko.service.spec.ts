import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CoinGeckoService } from '@/infrastructure/datasource/coingecko/coingecko.service';

import { fakeFetch, json } from '../../../support/fake-fetch';

const coin = (id: string, name: string, symbol: string, marketCap: number, price = 10) => ({
  id,
  name,
  symbol,
  image: `https://img/${id}.png`,
  current_price: price,
  market_cap: marketCap,
  total_volume: 1000,
  price_change_percentage_1h_in_currency: 1,
  price_change_percentage_24h_in_currency: -2,
  price_change_percentage_7d_in_currency: 5,
  sparkline_in_7d: { price: Array.from({ length: 12 }, (_, i) => i + 1) },
});

const COINS = [coin('apple-cb', 'Apple (Coinbase Tokenized Stock)', 'aaplx', 500), coin('nvidia-cb', 'NVIDIA (Coinbase Tokenized Stock)', 'nvdax', 900), coin('no-base', 'Other (Coinbase Tokenized Stock)', 'othx', 5)];

function feed(overrides: { markets?: (url: string) => Response | undefined } = {}) {
  return fakeFetch((url) => {
    if (url.includes('/coins/list')) {
      return json([
        { id: 'apple-cb', platforms: { base: '0xAPPLE' } },
        { id: 'nvidia-cb', platforms: { base: '0xNVDA' } },
        { id: 'no-base', platforms: { ethereum: '0xELSE' } },
      ]);
    }
    const custom = overrides.markets?.(url);
    if (custom) return custom;
    if (url.includes('category=tokenized-stock')) return json(COINS);
    if (url.includes('/coins/markets')) return json(COINS);
    if (url.includes('/simple/price')) return json({ ethereum: { usd: 3000 } });
    if (url.includes('/market_chart')) return json({ prices: [[2000, 5], [1000, 4]] });
    return undefined;
  });
}

describe('CoinGecko tokens', () => {
  beforeEach(() => {
    process.env.MARKET_CACHE_DIR = mkdtempSync(join(tmpdir(), 'market-'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    delete process.env.MARKET_CACHE_DIR;
    delete process.env.COINGECKO_API_KEY;
    jest.restoreAllMocks();
  });

  it('gives the tokenized stocks that are on Base, biggest first, with who issued them', async () => {
    const tokens = await new CoinGeckoService(feed().send).tokens();

    expect(tokens.map(({ symbol }) => symbol)).toEqual(['NVDAc', 'AAPLc']);
    expect(tokens[0]).toMatchObject({ id: 'nvidia-cb', issuer: 'Coinbase', company: 'NVIDIA', address: '0xNVDA', rank: 1, price: 10, marketCap: 900 });
  });

  it('turns percent changes into fractions and thins the week of prices', async () => {
    const [token] = await new CoinGeckoService(feed().send).tokens();
    expect(token).toMatchObject({ change1h: 0.01, change24h: -0.02, change7d: 0.05 });
    // 12 points, every 6th kept
    expect(token?.series).toEqual([6, 12]);
  });

  it('works the list out once however many ask', async () => {
    const { send, calls } = feed();
    const service = new CoinGeckoService(send);
    await Promise.all([service.tokens(), service.tokens()]);
    await service.tokens();
    expect(calls.filter((url) => url.includes('/coins/list'))).toHaveLength(1);
  });

  it('sends the key CoinGecko is given, when there is one', async () => {
    process.env.COINGECKO_API_KEY = 'secret';
    const seen: unknown[] = [];
    const send = (async (input: string | URL | Request, init?: RequestInit) => {
      seen.push(init?.headers);
      return json([]);
    }) as typeof fetch;
    await new CoinGeckoService(send).tokens();
    expect(seen[0]).toMatchObject({ 'x-cg-demo-api-key': 'secret' });
  });

  it('gives an empty list when CoinGecko refuses', async () => {
    const send = fakeFetch(() => new Response('', { status: 500 })).send;
    expect(await new CoinGeckoService(send).tokens()).toEqual([]);
  });

  it('gives a token\'s history as times in seconds, oldest first', async () => {
    const { send, calls } = feed();
    expect(await new CoinGeckoService(send).tokenHistory('apple-cb', 'week')).toEqual([
      { time: 1, price: 4 },
      { time: 2, price: 5 },
    ]);
    expect(calls[0]).toContain('days=7');
  });

  it('gives no history when CoinGecko fails', async () => {
    const send = fakeFetch(() => new Response('', { status: 500 })).send;
    expect(await new CoinGeckoService(send).tokenHistory('apple-cb', 'day')).toEqual([]);
  });

  it('gives the price of ETH', async () => {
    expect(await new CoinGeckoService(feed().send).ethPrice()).toBe(3000);
  });
});
