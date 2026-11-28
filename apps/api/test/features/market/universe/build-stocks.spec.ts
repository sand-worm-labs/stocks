import { buildStocks } from '@/features/market/universe/build-stocks';
import type { Listing } from '@/features/market/universe/universe.types';

const listing = (symbol: string, extra: Partial<Listing> = {}): Listing => ({ source: 'coinbase', symbol, name: `${symbol} Inc.`, address: `0x${symbol.toLowerCase()}`, ...extra });
const pool = (address: string, liquidity: number, price = 10, change24h = 2) => ({ address, pair: '0xp', quote: '0xq', price, liquidity, change24h });

describe('the stocks on offer', () => {
  it('can be bought when its token has a pool, with the pool’s price and depth', () => {
    const [stock] = buildStocks({ listings: [listing('PFEc')], pools: new Map([['0xpfec', pool('0xpfec', 5_000, 28, 1.5)]]), profiles: new Map() });
    expect(stock).toMatchObject({ symbol: 'PFEc', price: 28, liquidity: 5_000, dayChange: 0.015 });
  });

  it('is listed but cannot be bought without a pool', () => {
    const [stock] = buildStocks({ listings: [listing('XOMc')], pools: new Map(), profiles: new Map() });
    expect(stock?.liquidity).toBeUndefined();
  });

  it('knows its sector and industry from its company, and that a company not on an exchange is pre-IPO', () => {
    const profiles = new Map([
      ['PFE', { isListed: true, sector: 'Healthcare', industry: 'Drug Manufacturers—General' }],
      ['ANT', { isListed: false }],
    ]);
    const stocks = buildStocks({ listings: [listing('PFEc'), listing('ANTc'), listing('NEWc')], pools: new Map(), profiles });
    expect(stocks[0]).toMatchObject({ sector: 'Healthcare', industry: 'Drug Manufacturers—General' });
    expect(stocks[0]?.preIpo).toBeUndefined();
    expect(stocks[1]?.preIpo).toBe(true);
    // Not looked up yet is not the same as pre-IPO
    expect(stocks[2]?.preIpo).toBeUndefined();
  });

  it('is one stock when two sources list it, and says both do', () => {
    const stocks = buildStocks({ listings: [listing('PFEc'), listing('PFEc', { source: 'dinari', address: '0xother' })], pools: new Map(), profiles: new Map() });
    expect(stocks).toHaveLength(1);
    expect(stocks[0]).toMatchObject({ address: '0xpfec', sources: ['coinbase', 'dinari'] });
  });

  it('keeps the part of a token’s description that is about the company', () => {
    const [stock] = buildStocks({ listings: [listing('PFEc', { description: 'About Pfizer (Coinbase Tokenized Stock)\n\nPfizer makes medicines.\n\nOther things.' })], pools: new Map(), profiles: new Map() });
    expect(stock?.description).toBe('Pfizer makes medicines.');
  });
});
