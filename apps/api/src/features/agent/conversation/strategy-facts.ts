import { formatAmount, formatPercent } from '@/common/utils/format';
import type { Stock } from '@/features/market/types/market.types';
import { ledgerOf, positionsOf } from '@/features/strategies/trading/ledger';
import type { StrategyRecord } from '@/features/strategies/types/strategy-record';

export type Position = {
  symbol: string;
  name: string;
  units: number;
  cost: number;
  value: number;
  // Of everything in the strategy, cash included
  weight: number;
  // Against what was paid, as a fraction
  change: number;
};

// What a trading strategy is worth now, from its ledger and today's prices. The strategy's own record keeps what was paid, not what it is
// worth, so this is worked out whenever the agent is asked.
export type Standing = {
  positions: Position[];
  cash: number;
  value: number;
  // What the stocks cost, with the cash: the same "invested" the strategy's page shows, so the two never disagree
  invested: number;
  // Against what was invested, as a fraction
  change: number;
};

export function priceOf(stocks: Pick<Stock, 'symbol' | 'price'>[]) {
  const prices = new Map(stocks.flatMap(({ symbol, price }) => (price ? [[symbol, price] as const] : [])));
  return (symbol: string) => prices.get(symbol);
}

export function standingOf(record: StrategyRecord, stocks: Pick<Stock, 'symbol' | 'name' | 'price'>[]): Standing {
  const { holdings, cash } = positionsOf(ledgerOf(record));
  const price = priceOf(stocks);

  const valued = holdings.map(({ symbol, units, cost, entryPrice }) => ({
    symbol,
    name: stocks.find((stock) => stock.symbol === symbol)?.name ?? symbol,
    units,
    cost,
    value: units * (price(symbol) ?? entryPrice),
  }));
  const value = valued.reduce((sum, { value }) => sum + value, cash);
  const invested = valued.reduce((sum, { cost }) => sum + cost, cash);

  return {
    positions: valued.map((position) => ({
      ...position,
      weight: value > 0 ? position.value / value : 0,
      change: position.cost > 0 ? position.value / position.cost - 1 : 0,
    })),
    cash,
    value,
    invested,
    change: invested > 0 ? value / invested - 1 : 0,
  };
}

export const usdc = (amount: number) => `${formatAmount(amount)} USDC`;

/// "up 1.2%", "down 0.5%", or "level" when it has not moved
export function movement(change: number) {
  if (Math.abs(change) < 0.0005) return 'level';
  return `${change > 0 ? 'up' : 'down'} ${formatPercent(Math.abs(change))}`;
}

/// The largest share of the strategy one stock may be, from its rules
export const capOf = ({ rules }: StrategyRecord) => rules.find((rule) => rule.type === 'max-weight')?.limit;
