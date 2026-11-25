import { DataSource } from 'typeorm';

import { dataSourceOptions } from '@/infrastructure/database/data-source';

import { StrategiesService } from '../strategies.service';
import { StrategyRecord } from '../strategy-record';

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
    expect(await strategies.get('a')).toEqual(saved);
    expect(await strategies.get('missing')).toBeUndefined();
  });

  it('replaces a record saved again under its id, and records each event once', async () => {
    await strategies.save(record('a'));
    await strategies.save(record('a', ME, { name: 'Renamed', stage: 'researching', updatedAt: '2026-11-24T12:00:00.000Z' }));
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
    expect(await strategies.get('a')).toEqual(saved);
  });
});
