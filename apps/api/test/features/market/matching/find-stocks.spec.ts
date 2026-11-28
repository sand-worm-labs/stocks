import { findStocks } from '@/features/market/matching/find-stocks';
import { marketPackFor, spreadAcrossSectors } from '@/features/market/matching/market-pack';
import type { Stock } from '@/features/market/types/market.types';

const stock = (symbol: string, name: string, sector: string | undefined, industry: string | undefined, liquidity?: number): Stock => ({ symbol, name, sector, industry, liquidity });

const stocks = [
  stock('PFEc', 'Pfizer Inc', 'Healthcare', 'Drug Manufacturers—General', 5_000),
  stock('LLYc', 'Eli Lilly & Co', 'Healthcare', 'Drug Manufacturers—General', 224_000),
  stock('JNJc', 'Johnson & Johnson', 'Healthcare', 'Drug Manufacturers—General'),
  stock('XOMc', 'ExxonMobil Holdings Corporation', 'Energy', 'Oil & Gas Integrated'),
  stock('NVDAc', 'NVIDIA Corporation', 'Technology', 'Semiconductors', 2_000_000),
  stock('AAPLc', 'Apple Inc.', 'Technology', 'Consumer Electronics', 570_000),
  stock('JPMc', 'JPMorgan Chase & Co.', 'Financial Services', 'Banks—Diversified', 100_000),
];
const market = { stocks, categories: [{ id: 'robotics', label: 'Robotics', symbols: ['NVDAc'], unavailable: [] }] };
const symbols = (term: string) => findStocks(term, market).map(({ symbol }) => symbol);

describe('finding the stocks an idea is about', () => {
  it('finds a kind of company by its sector and industry, not by a list of names', () => {
    expect(symbols('pharma')).toEqual(['PFEc', 'LLYc', 'JNJc']);
    expect(symbols('healthcare')).toEqual(['PFEc', 'LLYc', 'JNJc']);
    expect(symbols('oil')).toEqual(['XOMc']);
    expect(symbols('banks')).toEqual(['JPMc']);
    expect(symbols('chips')).toEqual(['NVDAc']);
  });

  it('finds a company by its ticker or its name', () => {
    expect(symbols('NVDA')).toEqual(['NVDAc']);
    expect(symbols('Apple')).toEqual(['AAPLc']);
    expect(symbols('exxonmobil')).toEqual(['XOMc']);
  });

  it('finds a kind of company described in words, by the words of its sector and industry, plural or not', () => {
    const food = [...stocks, stock('KHCc', 'Kraft Heinz Company', 'Consumer Defensive', 'Packaged Foods'), stock('DASHc', 'DoorDash, Inc.', 'Consumer Cyclical', 'Internet Retail')];
    expect(findStocks('food tech', { stocks: food, categories: [] }).map(({ symbol }) => symbol)).toEqual(['KHCc']);
  });

  it('finds a category kept in the database', () => {
    expect(symbols('Robotics')).toEqual(['NVDAc']);
  });

  it('finds, for a word with no topic, the stocks that say it about themselves', () => {
    expect(symbols('electronics')).toEqual(['AAPLc']);
    expect(symbols('zzzz')).toEqual([]);
  });

  it('says which of what it found can be bought: the others are listed with no pool yet', () => {
    const pack = marketPackFor(['pharma', 'oil', 'gold'], market, new Date('2026-11-26T00:00:00Z'));
    expect(pack.topics).toEqual([
      { term: 'pharma', matches: 3, buyable: 2 },
      { term: 'oil', matches: 1, buyable: 0 },
      { term: 'gold', matches: 0, buyable: 0 },
    ]);
    // What can be bought first, the deepest pool first, then what cannot
    expect(pack.candidates.map(({ symbol }) => symbol)).toEqual(['LLYc', 'PFEc', 'JNJc', 'XOMc']);
    expect(pack.notes).toEqual(['1 listed stocks match “oil”, but none has a pool on Base to buy it in yet.', 'Nothing listed on Base is “gold”.']);
    expect(pack.universe).toEqual({ listed: 7, buyable: 5, preIpo: 0 });
  });

  it('spreads an idea that names nothing across sectors instead of taking the most traded names', () => {
    const picked = spreadAcrossSectors(stocks, 4).map(({ symbol }) => symbol);
    expect(picked).toEqual(['NVDAc', 'LLYc', 'JPMc', 'AAPLc']);
    expect(marketPackFor([], market).candidates.map(({ symbol }) => symbol)).toEqual(['NVDAc', 'LLYc', 'JPMc', 'AAPLc', 'PFEc']);
  });
});
