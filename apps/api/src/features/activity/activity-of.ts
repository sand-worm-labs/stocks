import { Json } from '@/common/types/json';
import { EventKind, StrategyRecord } from '@/features/strategies/types/kept-record';

// A strategy's events are kept as its activity: each is a kind of activity, and each happens once
export const ACTIVITY_OF_EVENT = {
  created: 'drafted',
  researching: 'researching',
  ready: 'ready',
  live: 'started',
} as const;
export const EVENT_OF_ACTIVITY = Object.fromEntries(
  Object.entries(ACTIVITY_OF_EVENT).map(([event, kind]) => [kind, event]),
) as Record<string, EventKind>;
export const ACTIVITY_KINDS = Object.values(ACTIVITY_OF_EVENT);

const shorten = (text: string) => (text.length > 90 ? `${text.slice(0, 87)}…` : text);

const WORDS: Record<
  EventKind,
  (record: StrategyRecord) => {
    title: string;
    detail: string;
    action?: Json;
  }
> = {
  created: ({ brief }) => ({
    title: 'Strategy drafted',
    detail: `From your idea: “${shorten(brief)}”`,
  }),
  researching: ({ name }) => ({
    title: 'Research started',
    detail: `Sandworm is researching ${name}. You don't need to wait: you'll be notified when the report is ready.`,
  }),
  ready: ({ name, id }) => ({
    title: 'Your report is ready',
    detail: `The research on ${name} has finished. Read the results, then decide whether to trade.`,
    action: { label: 'View results', route: 'portfolio', slug: id },
  }),
  live: ({ name }) => ({
    title: 'Strategy started',
    detail: `${name} is trading.`,
  }),
};

export const activityOf = (record: StrategyRecord) =>
  record.events.map(({ kind, at }) => ({
    kind: ACTIVITY_OF_EVENT[kind],
    at,
    ...WORDS[kind](record),
  }));
