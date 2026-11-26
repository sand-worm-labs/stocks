import { Json } from '@/common/types/json';
import type { LedgerLine } from '@/features/strategies/trading/kept-ledger';

// A strategy as the Next app holds it, and as it is sent here to be kept: one document, spread over the tables when it is saved.
export type Holding = {
  symbol: string;
  units: number;
  entryPrice: number;
  cost: number;
  value: number;
};

export type EventKind = 'created' | 'researching' | 'ready' | 'live';

export type StrategyRecord = {
  id: string;
  // How many times it has been saved. A save of one that exists has to carry the revision it was read at, and is refused if it has moved on since.
  revision?: number;
  ownerId: string;
  name: string;
  brief: string;
  status: string;
  stage: string;
  rules: Json[];
  strategy: Json;
  summary: Json[];
  assumption: string;
  budget: number;
  report?: Json;
  orders?: Json[];
  holdings: Holding[];
  // Everything that happened to the strategy's money, oldest first; only ever added to
  ledger?: { kind: LedgerLine['kind']; symbol?: string; units?: number; price?: number; usdc: number; fee?: number; at: string }[];
  cash: number;
  funding?: {
    mode: 'paper' | 'live';
    amount: number;
    chainId?: number;
    from?: string;
    approval?: {
      message: string;
      signature: string;
      balance: number;
      expiresAt: string;
    };
  };
  research?: {
    startedAt: string;
    readyAt?: string;
    mode?: 'timed' | 'waiting';
    runner?: 'sandworm' | 'agent';
    result?: Json;
    error?: string;
    progress?: Json;
  };
  events: { kind: EventKind; at: string }[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
};
