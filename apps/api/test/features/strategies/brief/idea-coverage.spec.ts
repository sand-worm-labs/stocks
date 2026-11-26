import { ideaCoverage, namedBy } from '@/features/strategies/brief/idea-coverage';
import type { Market } from '@/features/strategies/design/pipeline.types';

const stock = (symbol: string, name: string, liquidity?: number) => ({ symbol, name, liquidity, price: liquidity ? 100 : undefined });

// What is on Base: tech and chips, with energy listed as a category but nothing in it to buy
const market: Market = {
  stocks: [
    stock('AAPLc', 'Apple Inc.', 500_000),
    stock('NVDAc', 'NVIDIA Corporation', 900_000),
    stock('TSLAc', 'Tesla, Inc.', 600_000),
    stock('GOOGLc', 'Alphabet Inc.', 700_000),
    stock('XOMc', 'Exxon Mobil Corporation'),
  ],
  categories: [
    { id: 'big-tech', label: 'Big Tech', symbols: ['AAPLc', 'GOOGLc', 'TSLAc', 'NVDAc'] },
    { id: 'ai', label: 'AI & Chips', symbols: ['NVDAc'] },
    { id: 'energy', label: 'Energy & Materials', symbols: [], unavailable: ['XOMc'] },
  ],
};

const symbols = ['NVDAc', 'GOOGLc', 'AAPLc'];
const cover = (brief: string, maxShare?: number) => ideaCoverage({ brief, symbols, market, maxShare });

describe('what an idea names, against what can be bought on Base', () => {
  it('says so, in plain words, when nothing an idea names can be bought (the oil idea)', () => {
    const coverage = cover('Grow 1,000 USDC in oil stocks (Exxon, Chevron, Shell and similar). Find the ones most likely to gain, 3 to 5 stocks. Ask before buying.');

    expect(coverage.basis).toBe('fallback');
    expect(coverage.couldntMatch).toEqual(expect.arrayContaining(['oil', 'Exxon', 'Chevron', 'Shell']));
    expect(coverage.couldntMatch).not.toContain('similar');
    expect(coverage.headline).toMatch(/^Nothing on Base matches oil/);
    expect(coverage.detail).toMatch(/most liquid stocks instead: NVDAc, GOOGLc and AAPLc/);
    expect(coverage.tests.map(({ symbol }) => symbol)).toEqual(symbols);
  });

  it('has nothing to say when everything named is there', () => {
    const coverage = cover('Grow 500 USDC in big tech and chips. Max 35% in one stock.', 0.35);
    expect(coverage).toMatchObject({ basis: 'named', couldntMatch: [] });
    expect(coverage.headline).toBeUndefined();
  });

  it('says which part of an idea is covered and which is not', () => {
    const coverage = cover('Grow 500 USDC in stocks such as Tesla, Exxon and Nvidia');
    expect(coverage.basis).toBe('partly');
    expect(coverage.couldntMatch).toEqual(['Exxon']);
    expect(coverage.headline).toBe('Not on Base yet: Exxon');
  });

  it('finds a stock by its name or its ticker as a whole word, not by a piece of another word', () => {
    expect(cover('Put it in (Apple, NVDA)').couldntMatch).toEqual([]);
    // "gold" is not a piece of anything on offer, and "Goldman" is not a stock here
    expect(cover('Grow 500 USDC in gold stocks').couldntMatch).toEqual(['gold']);
  });

  it("says nothing was specific when an idea doesn't name anything to find", () => {
    expect(cover('Grow 500 USDC safely over 3+ years. Ask before buying.').basis).toBe('open');
  });

  it("doesn't take what is not a company for one", () => {
    expect(namedBy('Grow 500 USDC (max 25% in one stock) and keep USDC safe')).toEqual([]);
    expect(namedBy('Low gas fees and a retail investor mindset')).toEqual([]);
  });

  it("doesn't look for what the person said to avoid", () => {
    expect(namedBy('Grow 500 USDC in big tech, avoid oil')).toEqual(['Big tech']);
  });

  it('says how much stays in cash when the cap leaves no room for more stocks', () => {
    const coverage = cover('Grow 500 USDC in big tech. Max 20% in any one stock.', 0.2);
    expect(coverage.cashLeft).toBeCloseTo(0.4);
    expect(coverage.headline).toBe('Part of the money stays in cash');
    expect(coverage.detail).toBe('At 20% a stock, 3 stocks leave 40% of the money in cash.');
  });

  it('adds the cash to what it says when part of an idea is missing too', () => {
    const coverage = cover('Grow 500 USDC in oil, max 20% in one stock', 0.2);
    expect(coverage.detail).toMatch(/leave 40% of the money in cash\.$/);
  });
});
