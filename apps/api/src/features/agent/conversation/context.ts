import type { Stock } from '@/features/market/types/market.types';
import type { IdeaCoverage } from '@/features/strategies/brief/idea-coverage';
import type { rulesView } from '@/features/strategies/rules/rules-view';
import type { StrategyRecord } from '@/features/strategies/types/strategy-record';

// What the agent knows when it answers: the strategy as it stands, today's market, and the rules as the rules page shows them
export type Context = {
  record: StrategyRecord;
  stocks: Stock[];
  rules: ReturnType<typeof rulesView>;
  // What the idea named that isn't on Base, and what is tested instead
  coverage: IdeaCoverage;
  now: Date;
};
