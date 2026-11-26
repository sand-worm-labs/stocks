import { ConflictException, Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

import { Profile } from '@/features/accounts/entities/profile.entity';
import { Activity } from '@/features/activity/entities/activity.entity';

import { ACTIVITY_KINDS, EVENT_OF_ACTIVITY, activityOf } from '@/features/activity/activity-of';
import { LedgerEntry } from '@/features/strategies/entities/ledger-entry.entity';
import { ResearchRun } from '@/features/strategies/entities/research-run.entity';
import { StrategyVersion } from '@/features/strategies/entities/strategy-version.entity';
import { Strategy } from '@/features/strategies/entities/strategy.entity';
import { TradeApproval } from '@/features/strategies/entities/trade-approval.entity';
import { depositedIn, LedgerLine, openingLines, positionsOf } from '@/features/strategies/trading/kept-ledger';
import { StrategyRecord } from '@/features/strategies/types/kept-record';

const VERSION = 1;

const iso = (date: Date) => date.toISOString();

function group<T>(items: T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

// Keeps strategies. A strategy arrives as one record and is spread over the tables (the strategy, its version, the research run, the
// ledger, the approval a wallet signed, and its events as activity); it is put back together as one record when it is read.
@Injectable()
export class StrategiesService {
  constructor(private readonly dataSource: DataSource) {}

  async list(ownerId: string) {
    const rows = await this.dataSource.manager.find(Strategy, {
      where: { ownerId },
      order: { createdAt: 'DESC' },
    });
    return this.assemble(rows);
  }

  async get(id: string) {
    const row = await this.dataSource.manager.findOneBy(Strategy, { id });
    if (!row) return undefined;
    const [record] = await this.assemble([row]);
    return record;
  }

  /// The strategies whose research Sandworm is doing from this server and has not finished or failed. Such a run lives in this process, so
  /// when the server starts, whatever is listed was left behind by the one before it.
  async sandwormRunsInProgress(): Promise<{ id: string; ownerId: string }[]> {
    const rows: { id: string; owner_id: string }[] = await this.dataSource.query(
      `SELECT s."id", s."owner_id" FROM "research_runs" r
       JOIN "strategies" s ON s."id" = r."strategy_id" AND s."current_version" = r."version"
       WHERE r."mode" = 'waiting' AND r."status" = 'running' AND r."source" = 'sandworm' AND r."error" IS NULL AND r."result" IS NULL`,
    );
    return rows.map(({ id, owner_id }) => ({ id, ownerId: owner_id }));
  }

  /// Keeps the record, and says which revision it now is. Refused (409) if the strategy has been saved since the revision the record carries,
  /// so a save made from an old read can't undo what came after.
  async save(record: StrategyRecord): Promise<number> {
    return this.dataSource.transaction(async (tx) => {
      await tx.createQueryBuilder().insert().into(Profile).values({ userId: record.ownerId }).orIgnore().execute();
      const revision = await nextRevision(tx, record);
      await saveStrategy(tx, record, revision);
      await saveResearch(tx, record);
      await openLedger(tx, record);
      await saveApproval(tx, record);
      await saveEvents(tx, record);
      return revision;
    });
  }

  // Strategies as records: everything that belongs to all of them is read at once, not strategy by strategy
  private async assemble(rows: Strategy[]): Promise<StrategyRecord[]> {
    if (rows.length === 0) return [];
    const strategyId = In(rows.map(({ id }) => id));
    const db = this.dataSource.manager;

    const [versions, runs, lines, approvals, events] = await Promise.all([
      db.find(StrategyVersion, { where: { strategyId } }),
      db.find(ResearchRun, {
        where: { strategyId },
        order: { startedAt: 'DESC' },
      }),
      db.find(LedgerEntry, {
        where: { strategyId },
        order: { at: 'ASC', id: 'ASC' },
      }),
      db.find(TradeApproval, { where: { strategyId } }),
      db.find(Activity, {
        where: { strategyId, kind: In(ACTIVITY_KINDS) },
        order: { at: 'ASC' },
      }),
    ]);
    const linesOf = group(lines, (line) => line.strategyId);
    const runsOf = group(runs, (run) => run.strategyId);
    const eventsOf = group(events, (event) => event.strategyId ?? '');

    return rows.map((row) => {
      const version = versions.find((v) => v.strategyId === row.id && v.version === row.currentVersion);
      if (!version) throw new Error(`Strategy ${row.id} has no version ${row.currentVersion}`);

      const run = runsOf.get(row.id)?.find((r) => r.version === row.currentVersion);
      const approval = approvals.find((a) => a.strategyId === row.id);
      const entries = (linesOf.get(row.id) ?? []).map(({ kind, symbol, units, price, usdc, fee, at }): LedgerLine => ({
        kind,
        symbol: symbol ?? undefined,
        units: units ?? undefined,
        price: price ?? undefined,
        usdc,
        fee,
        at,
      }));
      const { holdings, cash } = positionsOf(entries);

      return {
        id: row.id,
        revision: row.revision,
        ownerId: row.ownerId,
        name: row.name,
        brief: row.brief,
        status: row.status,
        stage: row.stage ?? 'ready',
        rules: version.rules,
        strategy: version.spec,
        summary: version.summary,
        assumption: version.assumption,
        budget: version.budget,
        report: run?.report ?? undefined,
        orders: run?.orders ?? undefined,
        holdings,
        cash,
        ledger: entries.map(({ at, ...line }) => ({ ...line, at: iso(at) })),
        funding: row.mode
          ? {
              mode: row.mode === 'wallet' ? 'live' : 'paper',
              amount: depositedIn(entries),
              ...(approval && {
                chainId: approval.chainId,
                from: approval.wallet,
                approval: {
                  message: approval.message,
                  signature: approval.signature,
                  balance: approval.balanceSeen,
                  expiresAt: iso(approval.expiresAt),
                },
              }),
            }
          : undefined,
        research: run && {
          startedAt: iso(run.startedAt),
          readyAt: run.expectedAt ? iso(run.expectedAt) : undefined,
          mode: run.mode ?? undefined,
          runner: run.mode === 'waiting' && run.source !== 'standin' ? run.source : undefined,
          result: run.result ?? undefined,
          error: run.error ?? undefined,
          progress: run.progress ?? undefined,
        },
        events: (eventsOf.get(row.id) ?? []).map(({ kind, at }) => ({
          kind: EVENT_OF_ACTIVITY[kind]!,
          at: iso(at),
        })),
        createdAt: iso(row.createdAt),
        updatedAt: iso(row.updatedAt),
        startedAt: row.startedAt ? iso(row.startedAt) : undefined,
      } as StrategyRecord;
    });
  }
}

// The revision a record is saved as. The row is locked while it is read, so two saves of one strategy at once are taken one after the other, and
// the second sees what the first did.
async function nextRevision(tx: EntityManager, record: StrategyRecord): Promise<number> {
  const current = await tx.findOne(Strategy, { where: { id: record.id }, lock: { mode: 'pessimistic_write' } });
  if (!current) return 1;
  if (record.revision !== current.revision) throw new ConflictException('It changed while you were working on it. Load it again');
  return current.revision + 1;
}

async function saveStrategy(tx: EntityManager, record: StrategyRecord, revision: number) {
  await tx.upsert(
    Strategy,
    {
      id: record.id,
      ownerId: record.ownerId,
      name: record.name,
      brief: record.brief,
      status: record.status,
      stage: record.stage,
      mode: record.funding && (record.funding.mode === 'live' ? 'wallet' : 'paper'),
      currentVersion: VERSION,
      revision,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      startedAt: record.startedAt ? new Date(record.startedAt) : null,
    },
    ['id'],
  );
  await tx.upsert(
    StrategyVersion,
    {
      strategyId: record.id,
      version: VERSION,
      rules: record.rules,
      spec: record.strategy,
      summary: record.summary,
      assumption: record.assumption,
      budget: record.budget,
    },
    ['strategyId', 'version'],
  );
}

async function saveResearch(tx: EntityManager, record: StrategyRecord) {
  if (!record.research && !record.report) return;
  const isReady = !(record.status === 'draft' && record.stage === 'researching');
  const finished = record.events.find(({ kind }) => kind === 'ready')?.at ?? record.updatedAt;
  const run = {
    source: record.research?.mode === 'waiting' ? (record.research.runner ?? 'sandworm') : ('standin' as const),
    mode: record.research?.mode ?? null,
    result: record.research?.result ?? null,
    error: record.research?.error ?? null,
    progress: record.research?.progress ?? null,
    status: isReady ? ('ready' as const) : ('running' as const),
    startedAt: new Date(record.research?.startedAt ?? record.createdAt),
    expectedAt: record.research?.readyAt ? new Date(record.research.readyAt) : null,
    finishedAt: isReady ? new Date(finished) : null,
    report: record.report ?? null,
    orders: record.orders ?? null,
  };

  const existing = await tx.findOne(ResearchRun, {
    where: { strategyId: record.id, version: VERSION },
    order: { startedAt: 'DESC' },
  });
  if (existing) await tx.update(ResearchRun, existing.id, run);
  else
    await tx.insert(ResearchRun, {
      strategyId: record.id,
      version: VERSION,
      ...run,
    });
}

// The first time a strategy is live, its starting cash and stocks are written to the ledger. After that the ledger only grows: lines the
// record has past those already kept are added, and none already kept is ever changed.
async function openLedger(tx: EntityManager, record: StrategyRecord) {
  if (record.status !== 'live' || !record.funding) return;

  const kept = await tx.countBy(LedgerEntry, { strategyId: record.id });
  if (kept === 0) {
    const at = new Date(record.startedAt ?? record.updatedAt);
    const lines = openingLines(record.holdings, record.funding.amount, at);
    await tx.insert(
      LedgerEntry,
      lines.map((line) => ({ ...line, strategyId: record.id })),
    );
    return;
  }

  const fresh = (record.ledger ?? []).slice(kept);
  if (fresh.length === 0) return;
  await tx.insert(
    LedgerEntry,
    fresh.map(({ at, ...line }) => ({ ...line, at: new Date(at), strategyId: record.id })),
  );
}

async function saveApproval(tx: EntityManager, record: StrategyRecord) {
  const { funding } = record;
  if (!funding?.approval || !funding.from || funding.chainId === undefined) return;

  const { message, signature, balance, expiresAt } = funding.approval;
  await tx
    .createQueryBuilder()
    .insert()
    .into(TradeApproval)
    .values({
      strategyId: record.id,
      wallet: funding.from.toLowerCase(),
      chainId: funding.chainId,
      maxAmount: funding.amount,
      message,
      signature,
      balanceSeen: balance,
      expiresAt: new Date(expiresAt),
    })
    .orIgnore()
    .execute();
}

async function saveEvents(tx: EntityManager, record: StrategyRecord) {
  const done = await tx.find(Activity, {
    where: { strategyId: record.id, kind: In(ACTIVITY_KINDS) },
    select: { kind: true },
  });
  const known = new Set(done.map(({ kind }) => kind));

  const fresh = activityOf(record).filter(({ kind }) => !known.has(kind));
  if (fresh.length === 0) return;

  await tx.insert(
    Activity,
    fresh.map(({ kind, title, detail, at, action }) => ({
      userId: record.ownerId,
      strategyId: record.id,
      kind,
      title,
      detail,
      data: { action },
      at: new Date(at),
    })),
  );
}
