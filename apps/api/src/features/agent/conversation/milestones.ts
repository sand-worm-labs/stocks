import { formatAmount } from '@/common/utils/format';
import type { AgentBlock } from '@/features/agent/types/agent-message.types';
import { ledgerOf } from '@/features/strategies/trading/ledger';
import type { StrategyRecord } from '@/features/strategies/types/strategy-record';
import { link, links, note, say } from './replies';

// What happened to a strategy that the conversation should say, in the words the agent would have used when it happened. Each is kept once,
// under its name, with the time it happened at, so the conversation reads in order from the idea on, wherever it was first opened.
export type Milestone = { key: 'idea' | 'research' | 'live' | 'closed'; from: 'user' | 'agent'; blocks: AgentBlock[]; at: Date };

const eventAt = (record: StrategyRecord, kind: StrategyRecord['events'][number]['kind']) => {
  const found = record.events.find((event) => event.kind === kind);
  return found ? new Date(found.at) : undefined;
};

const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function milestonesOf(record: StrategyRecord): Milestone[] {
  const created = new Date(record.createdAt);
  const started = new Date(record.startedAt ?? record.updatedAt);
  const milestones: Milestone[] = [{ key: 'idea', from: 'user', blocks: [say(record.brief)], at: created }];

  const result = record.research?.result;
  if (result) {
    const worry = result.checks.find(({ tone }) => tone !== 'good');
    const blocks: AgentBlock[] = [say(result.headline)];
    if (worry) blocks.push(note('Worth knowing', worry.text, worry.tone === 'bad' ? 'negative' : 'warning'));
    blocks.push(links(link('Open the results', 'report', record.id)));
    // Never before the idea, and never after it went live, however the times were kept
    const at = new Date(Math.min(Math.max((eventAt(record, 'ready') ?? created).getTime(), created.getTime() + 1), started.getTime() - 1));
    milestones.push({ key: 'research', from: 'agent', blocks, at });
  }

  const hasTraded = record.status === 'live' || record.status === 'closed';
  if (hasTraded) milestones.push({ key: 'live', from: 'agent', blocks: [say(startedText(record))], at: started });
  if (record.status === 'closed' && record.closedAt) {
    milestones.push({ key: 'closed', from: 'agent', blocks: [say(`Closed on ${day.format(new Date(record.closedAt))}: everything was sold and the cash taken out. It is kept to read, and can be deleted whenever you like.`)], at: new Date(record.closedAt) });
  }
  return milestones;
}

function startedText(record: StrategyRecord) {
  const opening = ledgerOf(record).filter(({ kind, at }) => kind === 'buy' && Date.parse(at) <= Date.parse(record.startedAt ?? record.updatedAt) + 1000);
  const spent = opening.reduce((sum, { usdc }) => sum - usdc, 0);
  const when = day.format(new Date(record.startedAt ?? record.updatedAt));
  const how = record.funding?.mode === 'paper' ? ' on paper' : '';
  const stocks = `${opening.length} stock${opening.length === 1 ? '' : 's'}`;
  return `Started${how}: bought ${stocks} for ${formatAmount(spent)} USDC on ${when}. Ask me how it is doing, what your rules say, or to add funds or sell.`;
}
