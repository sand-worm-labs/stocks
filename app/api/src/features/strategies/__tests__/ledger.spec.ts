import { depositedIn, openingLines, positionsOf } from '../ledger';

const at = new Date('2026-11-24T10:00:00.000Z');
const holdings = [
  { symbol: 'NVDAc', units: 2, entryPrice: 100, cost: 200, value: 200 },
  { symbol: 'TSLAc', units: 1, entryPrice: 300, cost: 300, value: 300 },
];
const PAID = 500 * 1.003;

describe('the ledger a strategy starts with', () => {
  it('pays in what was paid, fee included, and buys each stock at what it cost', () => {
    const lines = openingLines(holdings, PAID, at);
    expect(lines[0]).toMatchObject({ kind: 'deposit', usdc: PAID });
    expect(lines.slice(1)).toMatchObject([
      { kind: 'buy', symbol: 'NVDAc', units: 2, price: 100, fee: 200 * 0.003 },
      { kind: 'buy', symbol: 'TSLAc', units: 1, price: 300, fee: 300 * 0.003 },
    ]);
    expect(depositedIn(lines)).toBe(PAID);
  });

  it('leaves nothing in cash, and gives the same stocks back', () => {
    const { holdings: held, cash } = positionsOf(openingLines(holdings, PAID, at));
    expect(cash).toBe(0);
    expect(held).toEqual(holdings);
  });

  it('takes out the share of cost a sale sells, at the average paid', () => {
    const lines = [
      ...openingLines(holdings, PAID, at),
      { kind: 'sell' as const, symbol: 'NVDAc', units: -1, price: 150, usdc: 150, at },
    ];
    const { holdings: held } = positionsOf(lines);
    expect(held.find(({ symbol }) => symbol === 'NVDAc')).toMatchObject({ units: 1, cost: 100, entryPrice: 100 });
  });
});
