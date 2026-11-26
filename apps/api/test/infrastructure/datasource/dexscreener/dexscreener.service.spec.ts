import { DexScreenerService } from '@/infrastructure/datasource/dexscreener/dexscreener.service';

import { fakeFetch, json } from '../../../support/fake-fetch';

const pair = (token: string, id: string, liquidity: number, price = '100') => ({
  pairAddress: `0xPAIR${id}`,
  baseToken: { address: token },
  quoteToken: { address: '0xUSDC' },
  priceUsd: price,
  priceChange: { m5: 0.1, h1: 0.2, h24: 0.3 },
  volume: { h24: 5000 },
  liquidity: { usd: liquidity },
});

describe('DexScreener pools', () => {
  it('gives each token its deepest pool, in lowercase', async () => {
    const { send } = fakeFetch(() => json([pair('0xABC', '1', 1_000), pair('0xABC', '2', 5_000), pair('0xDEF', '3', 200)]));
    const quotes = await new DexScreenerService(send).quotes(['0xAbc', '0xdef']);

    expect(quotes).toHaveLength(2);
    expect(quotes.find(({ address }) => address === '0xabc')).toMatchObject({ pair: '0xpair2', quote: '0xusdc', price: 100, liquidity: 5_000, change24h: 0.3 });
  });

  it('skips a pool with no price', async () => {
    const { send } = fakeFetch(() => json([{ ...pair('0xABC', '1', 9_000), priceUsd: undefined }, pair('0xABC', '2', 100)]));
    const [quote] = await new DexScreenerService(send).quotes(['0xabc']);
    expect(quote?.pair).toBe('0xpair2');
  });

  it('asks for at most 30 tokens at a time', async () => {
    const { send, calls } = fakeFetch(() => json([]));
    const addresses = Array.from({ length: 65 }, (_, i) => `0x${i.toString(16).padStart(40, '0')}`);
    await new DexScreenerService(send).quotes(addresses);
    expect(calls).toHaveLength(3);
  });

  it('shares one look between everyone asking within a few seconds, whatever order they name the tokens in', async () => {
    const { send, calls } = fakeFetch(() => json([pair('0xABC', '1', 1)]));
    const service = new DexScreenerService(send);
    await service.quotes(['0xabc', '0xdef']);
    await service.quotes(['0xDEF', '0xAbc']);
    expect(calls).toHaveLength(1);
  });

  it('gives nothing when DexScreener fails, and nothing for no tokens', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await new DexScreenerService(fakeFetch(() => new Response('', { status: 500 })).send).quotes(['0xabc'])).toEqual([]);
    expect(await new DexScreenerService(fakeFetch(() => json([])).send).quotes([])).toEqual([]);
  });
});
