import type { StrategyRecord } from '@/features/strategies/types/strategy-record';

/// What the person can ask right now, for the chips above the box and the hints in it. Only things the agent really does at this point.
export function suggestionsOf(record: StrategyRecord): string[] {
  if (record.status === 'unbuildable') return [];
  if (record.status === 'draft') {
    return record.stage === 'ready' ? ['How did the research go?', 'What are my rules?'] : ['What are my rules?'];
  }
  const asks = ['How is it doing?', 'What do I hold?', 'What are my rules?'];
  return record.funding?.mode === 'paper' ? [...asks, 'Add 100 USDC'] : asks;
}
