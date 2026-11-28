import { DataSource } from 'typeorm';

import { dataSourceOptions } from '@/infrastructure/database/data-source';
import { toMessage } from '@/features/agent/agent-thread.service';
import { AgentMessageRow } from '@/features/agent/entities/agent-message.entity';
import type { ResearchChatLog } from '@/features/research/types/research-chat.types';
import { ResearchChatLogService } from '@/features/strategies/research-chat-log.service';
import { StrategiesService } from '@/features/strategies/strategies.service';
import { StrategyRecord } from '@/features/strategies/types/kept-record';
import { ownDatabase } from '../../support/own-database';

const ME = '11111111-1111-4111-8111-111111111111';
const STARTED = '2026-11-26T10:00:00.000Z';

const researching = (id: string): StrategyRecord => ({
  id,
  ownerId: ME,
  name: `Strategy ${id}`,
  brief: 'Grow 500 USDC',
  status: 'draft',
  stage: 'researching',
  rules: [{ type: 'budget', amount: 500 }],
  strategy: { name: 'S', schedule: 'monthly', root: { type: 'cash' } },
  summary: [],
  assumption: '',
  budget: 500,
  holdings: [],
  cash: 0,
  research: { startedAt: STARTED, mode: 'waiting', runner: 'sandworm' },
  events: [{ kind: 'created', at: '2026-11-26T09:00:00.000Z' }],
  createdAt: '2026-11-26T09:00:00.000Z',
  updatedAt: '2026-11-26T09:00:00.000Z',
});

const log = (status: ResearchChatLog['status'], text = 'Working'): ResearchChatLog => ({
  runStartedAt: STARTED,
  status,
  notebookUrl: 'https://app.sandwormlab.xyz/workspace/w/documents/d/notebook/edit',
  parts: [{ type: 'text', text }],
});

const url = process.env.TEST_DATABASE_URL;
(url ? describe : describe.skip)('the log of what Sandworm\'s agent does', () => {
  let dataSource: DataSource;
  let service: ResearchChatLogService;
  let strategies: StrategiesService;

  beforeAll(async () => {
    // A database of its own, as another spec empties the tables of the shared one while this one runs
    dataSource = await new DataSource({ ...dataSourceOptions, url: await ownDatabase(url!, 'stocks_chatlog_test') }).initialize();
    strategies = new StrategiesService(dataSource);
  });
  afterAll(() => dataSource.destroy());
  beforeEach(async () => {
    await dataSource.query('truncate profiles, strategies, activity, ledger cascade');
    await strategies.save(researching('a'));
    service = new ResearchChatLogService(dataSource);
  });
  afterEach(() => service.onApplicationShutdown());

  const rows = () => dataSource.getRepository(AgentMessageRow).find({ where: { strategyId: 'a' } });

  it("is one message of the strategy's chat, from the agent, at the time the run began, drawn as the run", async () => {
    await service.keep(ME, 'a', log('running'));
    const [row] = await rows();

    expect(row).toMatchObject({ author: 'agent', ownerId: ME, milestone: `sandworm-chat:${STARTED}` });
    expect(row!.createdAt.toISOString()).toBe(STARTED);
    expect(toMessage(row!).blocks).toEqual([
      { type: 'sandworm-run', status: 'running', notebookUrl: expect.stringContaining('/notebook/edit'), parts: [{ type: 'text', text: 'Working' }] },
    ]);
  });

  it('is the same message each time it is kept, and what it says is the latest', async () => {
    await service.keep(ME, 'a', log('running', 'One'));
    await service.keep(ME, 'a', log('done', 'Two'));
    const found = await rows();
    expect(found).toHaveLength(1);
    expect(found[0]!.blocks[0]).toMatchObject({ status: 'done', parts: [{ text: 'Two' }] });
  });

  it('is written at most once a second while the agent works, the first at once and the last never lost', async () => {
    await service.keep(ME, 'a', log('running', 'first'));
    await service.keep(ME, 'a', log('running', 'second'));
    await service.keep(ME, 'a', log('running', 'third'));
    // Inside the window only the first was written
    expect((await rows())[0]!.blocks[0]).toMatchObject({ parts: [{ text: 'first' }] });

    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect((await rows())[0]!.blocks[0]).toMatchObject({ parts: [{ text: 'third' }] });
  });

  it('is written at once when the run ends, and nothing that was waiting overwrites it afterwards', async () => {
    await service.keep(ME, 'a', log('running', 'first'));
    await service.keep(ME, 'a', log('running', 'second'));
    await service.keep(ME, 'a', log('done', 'final'));
    await new Promise((resolve) => setTimeout(resolve, 1300));
    expect((await rows())[0]!.blocks[0]).toMatchObject({ status: 'done', parts: [{ text: 'final' }] });
  });

  it('is a message for each run, so a research started again is told apart', async () => {
    await service.keep(ME, 'a', log('failed', 'old run'));
    await service.keep(ME, 'a', { ...log('running', 'new run'), runStartedAt: '2026-11-26T11:00:00.000Z' });
    const found = await rows();
    expect(found).toHaveLength(2);
    expect(found.map(({ milestone }) => milestone).sort()).toEqual([`sandworm-chat:${STARTED}`, 'sandworm-chat:2026-11-26T11:00:00.000Z']);
  });

  it('says a run that was going has stopped, when whoever was running it is gone, and leaves finished runs alone', async () => {
    await service.keep(ME, 'a', log('running'));
    await service.keep(ME, 'a', { ...log('done', 'finished'), runStartedAt: '2026-11-25T11:00:00.000Z' });
    await service.stop('a');

    const byKey = Object.fromEntries((await rows()).map(({ milestone, blocks }) => [milestone, (blocks[0] as { status: string }).status]));
    expect(byKey).toEqual({ [`sandworm-chat:${STARTED}`]: 'failed', 'sandworm-chat:2026-11-25T11:00:00.000Z': 'done' });
  });

  it('is told by an agent from outside as it goes: each step is added after the last, and the notebook and status are the latest said', async () => {
    await service.append(ME, 'a', STARTED, { runner: 'agent', parts: [{ type: 'text', text: 'Starting.' }] });
    await service.append(ME, 'a', STARTED, { notebookUrl: 'https://app.sandwormlab.xyz/n', parts: [{ type: 'action', state: 'ran', title: 'Backtest', blockType: 'python' }] });
    await service.append(ME, 'a', STARTED, { parts: [{ type: 'text', text: 'It made 12% a year.' }] });

    const [row] = await rows();
    expect(row!.blocks[0]).toEqual({
      type: 'sandworm-run',
      status: 'running',
      runner: 'agent',
      notebookUrl: 'https://app.sandwormlab.xyz/n',
      parts: [{ type: 'text', text: 'Starting.' }, { type: 'action', state: 'ran', title: 'Backtest', blockType: 'python' }, { type: 'text', text: 'It made 12% a year.' }],
    });
  });

  it('keeps only the latest steps of a very long run', async () => {
    for (let round = 0; round < 8; round++) {
      await service.append(ME, 'a', STARTED, { parts: Array.from({ length: 20 }, (_, i) => ({ type: 'text' as const, text: `step ${round * 20 + i}` })) });
    }
    const parts = ((await rows())[0]!.blocks[0] as { parts: { text: string }[] }).parts;
    expect(parts).toHaveLength(150);
    expect(parts.at(-1)!.text).toBe('step 159');
  });

  it('is settled as finished when the research is handed back, but only while it was going', async () => {
    await service.append(ME, 'a', STARTED, { parts: [{ type: 'text', text: 'Working' }] });
    await service.finish('a', STARTED, 'done');
    expect((await rows())[0]!.blocks[0]).toMatchObject({ status: 'done' });

    await service.finish('a', STARTED, 'failed');
    expect((await rows())[0]!.blocks[0]).toMatchObject({ status: 'done' });
    // A run that told nothing has no log to settle, and none is made
    await expect(service.finish('a', '2020-01-01T00:00:00.000Z', 'done')).resolves.toBeUndefined();
    expect(await rows()).toHaveLength(1);
  });

  it('never stops the research when it cannot be kept: a strategy deleted for good while it runs', async () => {
    await strategies.purge('a');
    await expect(service.keep(ME, 'a', log('running'))).resolves.toBeUndefined();
    expect(await rows()).toEqual([]);
  });
});
