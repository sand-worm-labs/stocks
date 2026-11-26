import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { dataSourceOptions } from '@/infrastructure/database/data-source';

import { StrategiesService } from '@/features/strategies/strategies.service';
import { StrategyRecord } from '@/features/strategies/types/kept-record';

const ME = '11111111-1111-4111-8111-111111111111';
const THEM = '22222222-2222-4222-8222-222222222222';
const PAID = 200.6;

const record = (id: string, ownerId = ME, extra: Partial<StrategyRecord> = {}): StrategyRecord => ({
  id,
  ownerId,
  name: `Strategy ${id}`,
  brief: 'Grow 500 USDC with robotics',
  status: 'draft',
  stage: 'rules',
  rules: [{ type: 'budget', amount: 500 }],
  strategy: { name: 'S', schedule: 'monthly', root: { type: 'cash' } },
  summary: [{ label: 'Goal', value: 'Growth' }],
  assumption: '',
  budget: 500,
  holdings: [],
  cash: 0,
  events: [{ kind: 'created', at: '2026-11-24T10:00:00.000Z' }],
  createdAt: '2026-11-24T10:00:00.000Z',
  updatedAt: '2026-11-24T10:00:00.000Z',
  ...extra,
});

const live = (id: string, extra: Partial<StrategyRecord> = {}) =>
  record(id, ME, {
    status: 'live',
    stage: 'ready',
    holdings: [{ symbol: 'NVDAc', units: 2, entryPrice: 100, cost: 200, value: 200 }],
    cash: 0,
    report: { verdict: 'ok' },
    orders: [{ symbol: 'NVDAc', side: 'buy' }],
    funding: { mode: 'paper', amount: PAID },
    research: { startedAt: '2026-11-24T10:01:00.000Z', readyAt: '2026-11-24T10:01:45.000Z' },
    events: [
      { kind: 'created', at: '2026-11-24T10:00:00.000Z' },
      { kind: 'researching', at: '2026-11-24T10:01:00.000Z' },
      { kind: 'ready', at: '2026-11-24T10:01:45.000Z' },
      { kind: 'live', at: '2026-11-24T10:05:00.000Z' },
    ],
    startedAt: '2026-11-24T10:05:00.000Z',
    updatedAt: '2026-11-24T10:05:00.000Z',
    ...extra,
  });

// Runs against a real Postgres, so the tables are the ones the migrations make. Set TEST_DATABASE_URL to an empty database to run it.
const url = process.env.TEST_DATABASE_URL;
(url ? describe : describe.skip)('StrategiesService', () => {
  let dataSource: DataSource;
  let strategies: StrategiesService;

  beforeAll(async () => {
    dataSource = await new DataSource({ ...dataSourceOptions, url }).initialize();
    strategies = new StrategiesService(dataSource);
  });
  afterAll(() => dataSource.destroy());
  beforeEach(() => dataSource.query('truncate profiles, strategies, activity, ledger cascade'));

  it('keeps what is saved, whole, and gives it back by id', async () => {
    const saved = record('a', ME, { startedAt: '2026-11-24T11:00:00.000Z' });
    await strategies.save(saved);
    expect(await strategies.get('a')).toEqual({ ...saved, revision: 1, ledger: [] });
    expect(await strategies.get('missing')).toBeUndefined();
  });

  it('replaces a record saved again under its id, and records each event once', async () => {
    await strategies.save(record('a'));
    await strategies.save(record('a', ME, { revision: 1, name: 'Renamed', stage: 'researching', updatedAt: '2026-11-24T12:00:00.000Z' }));
    const again = await strategies.get('a');
    expect(again).toMatchObject({ name: 'Renamed', stage: 'researching', updatedAt: '2026-11-24T12:00:00.000Z' });
    expect(again?.events).toHaveLength(1);
  });

  it("lists only one person's strategies, newest first", async () => {
    await strategies.save(record('old', ME, { createdAt: '2026-11-01T10:00:00.000Z' }));
    await strategies.save(record('new', ME, { createdAt: '2026-11-20T10:00:00.000Z' }));
    await strategies.save(record('theirs', THEM));
    expect((await strategies.list(ME)).map(({ id }) => id)).toEqual(['new', 'old']);
  });

  it('gives back a strategy that is trading: its stocks, what was paid in, and its research', async () => {
    const saved = live('a');
    await strategies.save(saved);
    const read = await strategies.get('a');
    expect(read).toMatchObject(saved);
    expect(read?.ledger?.map(({ kind }) => kind)).toEqual(['deposit', 'buy']);
  });

  it('adds to the ledger what a record has past what is kept, and holdings and cash follow', async () => {
    await strategies.save(live('a'));
    const kept = (await strategies.get('a'))!;
    const more = [
      ...(kept.ledger ?? []),
      { kind: 'deposit' as const, usdc: 100, at: '2026-11-25T10:00:00.000Z' },
      { kind: 'sell' as const, symbol: 'NVDAc', units: -1, price: 120, usdc: 119.64, fee: 0.36, at: '2026-11-25T11:00:00.000Z' },
    ];
    await strategies.save({ ...kept, ledger: more });
    // Saving the same thing again adds nothing
    await strategies.save({ ...kept, revision: 2, ledger: more });

    const after = await strategies.get('a');
    expect(after?.ledger).toHaveLength(4);
    expect(after?.holdings).toMatchObject([{ symbol: 'NVDAc', units: 1 }]);
    expect(after?.cash).toBeCloseTo(219.64, 2);
  });

  describe('revisions', () => {
    it('starts a new strategy at revision 1 and says so', async () => {
      expect(await strategies.save(record('a'))).toBe(1);
    });

    it('moves the revision on by one with each save, and says what it is now', async () => {
      await strategies.save(record('a'));
      expect(await strategies.save(record('a', ME, { revision: 1 }))).toBe(2);
      expect(await strategies.save(record('a', ME, { revision: 2 }))).toBe(3);
      expect((await strategies.get('a'))?.revision).toBe(3);
    });

    it('refuses a save made from a read that is out of date, and keeps what is there', async () => {
      await strategies.save(record('a'));
      await strategies.save(record('a', ME, { revision: 1, name: 'First change' }));

      await expect(strategies.save(record('a', ME, { revision: 1, name: 'Stale change' }))).rejects.toBeInstanceOf(ConflictException);
      expect((await strategies.get('a'))?.name).toBe('First change');
    });

    it('refuses a save of a strategy that exists from a record that carries no revision', async () => {
      await strategies.save(record('a'));
      await expect(strategies.save(record('a'))).rejects.toBeInstanceOf(ConflictException);
    });

    it('lets only one of two saves made at the same moment from the same read through', async () => {
      await strategies.save(record('a'));
      const results = await Promise.allSettled([
        strategies.save(record('a', ME, { revision: 1, name: 'One' })),
        strategies.save(record('a', ME, { revision: 1, name: 'Two' })),
      ]);

      expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
      expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1);
      expect((await strategies.get('a'))?.revision).toBe(2);
    });

    it('keeps the revisions of different strategies apart', async () => {
      await strategies.save(record('a'));
      await strategies.save(record('b'));
      await strategies.save(record('a', ME, { revision: 1 }));
      expect((await strategies.get('b'))?.revision).toBe(1);
    });

    it('treats a strategy kept before revisions existed as revision 0', async () => {
      await strategies.save(record('a'));
      await dataSource.query(`update strategies set revision = 0 where id = 'a'`);
      expect((await strategies.get('a'))?.revision).toBe(0);
      expect(await strategies.save(record('a', ME, { revision: 0 }))).toBe(1);
    });
  });

  describe('the trash', () => {
    const gone = (id: string, at: string) => record(id, ME, { deletedAt: at });

    it('keeps when a strategy was closed and when it was deleted, and gives them back', async () => {
      await strategies.save(live('a', { status: 'closed', closedAt: '2026-11-25T09:00:00.000Z', deletedAt: '2026-11-26T09:00:00.000Z' }));
      const kept = await strategies.get('a');
      expect(kept).toMatchObject({ status: 'closed', closedAt: '2026-11-25T09:00:00.000Z', deletedAt: '2026-11-26T09:00:00.000Z' });
    });

    it('keeps what is deleted out of the list, and lists it as removed, the latest first', async () => {
      await strategies.save(record('kept'));
      await strategies.save(gone('old', '2026-11-01T00:00:00.000Z'));
      await strategies.save(gone('new', '2026-11-20T00:00:00.000Z'));
      await strategies.save({ ...record('theirs', THEM), deletedAt: '2026-11-21T00:00:00.000Z' });

      expect((await strategies.list(ME)).map(({ id }) => id)).toEqual(['kept']);
      expect((await strategies.listRemoved(ME)).map(({ id }) => id)).toEqual(['new', 'old']);
    });

    it('puts a strategy back when its deletion is taken away', async () => {
      await strategies.save(gone('a', '2026-11-20T00:00:00.000Z'));
      const deleted = (await strategies.get('a'))!;
      await strategies.save({ ...deleted, deletedAt: undefined });
      expect((await strategies.list(ME)).map(({ id }) => id)).toEqual(['a']);
    });

    it('says what has been in the trash since before a day', async () => {
      await strategies.save(gone('old', '2026-10-01T00:00:00.000Z'));
      await strategies.save(gone('recent', '2026-11-25T00:00:00.000Z'));
      await strategies.save(record('kept'));
      expect(await strategies.removedBefore(new Date('2026-11-01T00:00:00.000Z'))).toEqual([{ id: 'old', ownerId: ME }]);
    });

    it('deletes for good: the strategy, its ledger, its research, its chat and its activity all go', async () => {
      await strategies.save(live('a', { deletedAt: '2026-11-20T00:00:00.000Z' }));
      await dataSource.query(`insert into agent_messages (strategy_id, owner_id, author, blocks) values ('a', $1, 'user', '[]')`, [ME]);
      const count = (table: string) => dataSource.query(`select count(*)::int as n from ${table} where strategy_id = 'a'`).then(([row]: { n: number }[]) => row!.n);
      expect(await count('activity')).toBeGreaterThan(0);

      await strategies.purge('a');
      expect(await strategies.get('a')).toBeUndefined();
      for (const table of ['activity', 'ledger', 'research_runs', 'strategy_versions', 'agent_messages']) expect(await count(table)).toBe(0);
    });

    it("leaves other strategies alone when one is deleted for good", async () => {
      await strategies.save(record('a'));
      await strategies.save(record('b'));
      await strategies.purge('a');
      expect((await strategies.list(ME)).map(({ id }) => id)).toEqual(['b']);
    });
  });

  describe('research that is going on', () => {
    const researching = (id: string, research: NonNullable<StrategyRecord['research']>) =>
      record(id, ME, { status: 'draft', stage: 'researching', holdings: [], funding: undefined, research, events: [{ kind: 'created', at: '2026-11-24T10:00:00.000Z' }, { kind: 'researching', at: '2026-11-24T10:01:00.000Z' }], startedAt: undefined });
    const started = '2026-11-24T10:01:00.000Z';

    it('keeps who is doing a run, and gives it back', async () => {
      await strategies.save(researching('a', { startedAt: started, mode: 'waiting', runner: 'agent' }));
      await strategies.save(researching('b', { startedAt: started, mode: 'waiting', runner: 'sandworm' }));
      await strategies.save(researching('c', { startedAt: started, readyAt: '2026-11-24T10:01:45.000Z', mode: 'timed' }));

      expect((await strategies.get('a'))?.research?.runner).toBe('agent');
      expect((await strategies.get('b'))?.research?.runner).toBe('sandworm');
      expect((await strategies.get('c'))?.research?.runner).toBeUndefined();
    });

    it("lists only the runs that Sandworm is doing from here and that haven't ended: what a restart leaves behind", async () => {
      await strategies.save(researching('agent', { startedAt: started, mode: 'waiting', runner: 'agent' }));
      await strategies.save(researching('going', { startedAt: started, mode: 'waiting', runner: 'sandworm' }));
      await strategies.save(researching('failed', { startedAt: started, mode: 'waiting', runner: 'sandworm', error: 'It stopped' }));
      await strategies.save(researching('timed', { startedAt: started, readyAt: '2026-11-24T10:01:45.000Z', mode: 'timed' }));
      await strategies.save(live('done'));

      expect(await strategies.sandwormRunsInProgress()).toEqual([{ id: 'going', ownerId: ME }]);
    });
  });
});
