import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { reportMockData } from '@/_mockdata/reports';
import { answer } from '@/features/agent/conversation/answer';
import type { Context } from '@/features/agent/conversation/context';
import { milestonesOf } from '@/features/agent/conversation/milestones';
import { standingOf } from '@/features/agent/conversation/strategy-facts';
import { suggestionsOf } from '@/features/agent/conversation/suggestions';
import { understand } from '@/features/agent/conversation/understand';
import type { AgentBlock } from '@/features/agent/types/agent-message.types';
import { createLocalPipeline } from '@/features/strategies/design/local-pipeline';
import { createStrategyService, type StrategyService } from '@/features/strategies/lifecycle/strategy-lifecycle';
import { rulesView } from '@/features/strategies/rules/rules-view';
import type { StrategyRecord } from '@/features/strategies/types/strategy-record';
import { MemoryStore } from '../../../support/memory-store';
import { BRIEF, market } from '../../../support/pipeline-fixtures';

let service: StrategyService;

beforeEach(async () => {
  service = createStrategyService({
    store: new MemoryStore(join(await mkdtemp(join(tmpdir(), 'agent-')), 's.json')),
    pipeline: createLocalPipeline(reportMockData[1]!),
    market: async () => market,
    random: () => 't1',
  });
});

const stocks = market.stocks;

async function draft() {
  return service.create('u1', BRIEF);
}

async function live(mode: 'paper' | 'live' = 'paper') {
  const created = await draft();
  await service.confirmRules('u1', created.id);
  const ready = await service.finishResearch('u1', created.id);
  return service.goLive('u1', ready.id, 400, { mode });
}

const contextOf = (record: StrategyRecord): Context => ({ record, stocks, rules: rulesView(record, stocks), now: new Date('2026-11-26T12:00:00Z') });

function ask(record: StrategyRecord, message: string) {
  const held = standingOf(record, stocks).positions;
  return answer(understand(message, { held, listed: stocks }), contextOf(record));
}

const blockOf = <T extends AgentBlock['type']>(blocks: AgentBlock[], type: T) => blocks.find((block): block is Extract<AgentBlock, { type: T }> => block.type === type);
const textOf = (blocks: AgentBlock[]) => blocks.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join(' ');

describe('what the person asks for', () => {
  const held = [{ symbol: 'AMZNc', name: 'Amazon' }, { symbol: 'TSLAc', name: 'Tesla' }];
  const listed = [...held, { symbol: 'NVDAc', name: 'NVIDIA' }];
  const kindOf = (message: string) => understand(message, { held, listed }).kind;

  it.each([
    ['How is it doing?', 'standing'],
    ["what's my worth", 'standing'],
    ['What do I hold?', 'holdings'],
    ['what are my rules?', 'rules'],
    ['where does the cap stand', 'rules'],
    ['how did the research go', 'research'],
    ['how much cash is there', 'cash'],
    ['Add 100 USDC', 'add-funds'],
    ['deposit $250', 'add-funds'],
    ['withdraw 20', 'take-out-cash'],
    ['sell half of Tesla', 'sell'],
    ['Sell everything', 'sell'],
    ['Put 40% in Tesla.', 'more-of'],
    ['OK. Add more NVIDIA with the cash then.', 'more-of'],
    ['raise the cap to 30%', 'change-rules'],
    ['set a stop-loss', 'change-rules'],
    ['Swap Tesla for Apple', 'change-stocks'],
    ['what can you do', 'help'],
    ['blah blah', 'unknown'],
  ])('reads "%s" as %s', (message, kind) => {
    expect(kindOf(message)).toBe(kind);
  });

  it('takes the amount, the stock and the share out of what was said', () => {
    expect(understand('add $1,250 please', { held, listed })).toEqual({ kind: 'add-funds', amount: 1250 });
    expect(understand('Put 40% in Tesla', { held, listed })).toEqual({ kind: 'more-of', symbol: 'TSLAc', named: undefined, target: 0.4 });
    expect(understand('sell half of Amazon', { held, listed })).toEqual({ kind: 'sell', symbols: ['AMZNc'], named: undefined, share: 0.5, isEverything: false });
    expect(understand('sell 25% of AMZN', { held, listed })).toMatchObject({ symbols: ['AMZNc'], share: 0.25 });
  });

  it('does not take "all" for a stock', () => {
    const withAll = [...listed, { symbol: 'ALLc', name: 'Allstate' }];
    expect(understand('sell all', { held, listed: withAll })).toMatchObject({ kind: 'sell', symbols: [], share: 1 });
  });
});

describe('a strategy that is trading on paper', () => {
  it('says how it is doing, from what it holds', async () => {
    const record = await live();
    const { blocks } = ask(record, 'How is it doing?');
    expect(textOf(blocks)).toMatch(/is worth .* USDC now/);
    expect(blockOf(blocks, 'facts')?.rows.length).toBeGreaterThan(2);
  });

  it('says where each rule stands, as locked', async () => {
    const record = await live();
    const rules = blockOf(ask(record, 'What are my rules?').blocks, 'rules');
    expect(rules?.note).toBe('Locked');
    expect(rules?.rules.length).toBeGreaterThan(2);
  });

  it('says when a rule is over its limit, in the rules and when asked how it is doing', async () => {
    const live$ = await live();
    // A cap that the strategy's biggest stock is already past
    const record = { ...live$, rules: [{ type: 'max-weight' as const, limit: 0.05 }] };

    const rules = blockOf(ask(record, 'What are my rules?').blocks, 'rules');
    expect(rules?.rules[0]).toMatchObject({ state: 'broken', detail: expect.stringMatching(/^Biggest is/) });

    const warning = blockOf(ask(record, 'How is it doing?').blocks, 'note');
    expect(warning).toMatchObject({ label: 'Over its limit', tone: 'warning' });
    expect(warning?.text).toMatch(/^Rule 1, Max 5% in any one stock: Biggest is/);
  });

  it('has no warning when every rule holds', async () => {
    const record = { ...(await live()), rules: [{ type: 'max-weight' as const, limit: 1 }] };
    expect(blockOf(ask(record, 'How is it doing?').blocks, 'note')).toBeUndefined();
  });

  it("refuses to put more in a stock than the rules' cap allows, and says which rule", async () => {
    const record = await live();
    const result = ask(record, 'Put 40% in Tesla.');
    const refusal = blockOf(result.blocks, 'note');
    expect(refusal).toMatchObject({ tone: 'negative' });
    expect(refusal?.label).toMatch(/^Refused · rule \d+ · max 20%/);
    expect(refusal?.text).toMatch(/can't change a locked rule/);
    expect(result.proposal).toBeUndefined();
  });

  it("says a stock that isn't in the strategy can't be added by chat", async () => {
    const record = await live();
    const result = ask(record, 'buy more OpenAI');
    expect(textOf(result.blocks)).toMatch(/isn't in this strategy/);
    expect(result.proposal).toBeUndefined();
  });

  it('proposes adding funds with what it would buy, and does nothing until confirmed', async () => {
    const record = await live();
    const { blocks, proposal } = ask(record, 'Add 100 USDC');
    expect(proposal?.step).toEqual({ kind: 'add-funds', amount: 100 });
    expect(proposal?.rows.map(({ label }) => label)).toEqual(expect.arrayContaining(['Stays in cash', 'Fees']));
    expect(textOf(blocks)).toMatch(/Nothing moves until you confirm/);
    expect((await service.owned('u1', record.id)).ledger).toEqual(record.ledger);
  });

  it('asks how much when no amount is given', async () => {
    const record = await live();
    const result = ask(record, 'add funds');
    expect(result.proposal).toBeUndefined();
    expect(blockOf(result.blocks, 'chips')?.chips).toContain('Add 100 USDC');
  });

  it('proposes selling half of one stock, priced and with its fee', async () => {
    const record = await live();
    const { proposal } = ask(record, 'sell half of Tesla');
    expect(proposal?.step).toEqual({ kind: 'sell', symbols: ['TSLAc'], share: 0.5 });
    expect(proposal?.rows.map(({ label }) => label)).toEqual(expect.arrayContaining(['You receive', 'Fees']));
  });

  it('sells the whole of a stock when no share is said, and everything when asked', async () => {
    const record = await live();
    expect(ask(record, 'sell Tesla').proposal?.step).toEqual({ kind: 'sell', symbols: ['TSLAc'], share: 1 });
    expect(ask(record, 'sell everything').proposal).toMatchObject({ title: 'Sell everything', step: { kind: 'sell', share: 1 } });
  });

  it('sells a share of everything when that is what was said', async () => {
    const record = await live();
    expect(ask(record, 'sell half of everything').proposal).toMatchObject({ step: { kind: 'sell', symbols: undefined, share: 0.5 } });
  });

  it('asks which stock when a sale names none', async () => {
    const record = await live();
    const result = ask(record, 'sell some');
    expect(result.proposal).toBeUndefined();
    expect(textOf(result.blocks)).toMatch(/Which stock/);
  });

  it('will not take out more cash than there is, and says so', async () => {
    const record = await live();
    const result = ask(record, 'withdraw 5000');
    expect(result.proposal).toBeUndefined();
    expect(blockOf(result.blocks, 'note')?.label).toBe('Not enough cash');
  });

  it("won't change locked rules or the stocks from chat, and points to where they can be changed", async () => {
    const record = await live();
    for (const message of ['raise the cap to 30%', 'swap Tesla for Apple']) {
      const result = ask(record, message);
      expect(result.proposal).toBeUndefined();
      expect(textOf(result.blocks)).toMatch(/locked/);
      expect(blockOf(result.blocks, 'actions')?.actions[0]).toMatchObject({ route: 'adapt', slug: record.id });
    }
  });

  it("says what it can do when it doesn't understand", async () => {
    const record = await live();
    expect(textOf(ask(record, 'what is the weather').blocks)).toMatch(/I can tell you how this strategy is doing/);
  });
});

describe('a strategy that trades from a wallet', () => {
  it('answers questions, but does not propose money steps that the strategy cannot do yet', async () => {
    const record = await live('live');
    expect(ask(record, 'How is it doing?').blocks.length).toBeGreaterThan(0);
    const result = ask(record, 'Add 100 USDC');
    expect(result.proposal).toBeUndefined();
    expect(blockOf(result.blocks, 'note')?.text).toMatch(/trades from your wallet/);
  });
});

describe('a strategy that is not trading yet', () => {
  it('says where it is and what to do next, and moves no money', async () => {
    const record = await draft();
    const result = ask(record, 'sell everything');
    expect(result.proposal).toBeUndefined();
    expect(blockOf(result.blocks, 'actions')?.actions[0]).toMatchObject({ route: 'rules' });
  });

  it('lets the rules be changed while they are not locked', async () => {
    const record = await draft();
    const text = textOf(ask(record, 'raise the cap to 30%').blocks);
    expect(text).toMatch(/aren't locked yet/);
  });

  it('suggests only what it can do at that point', async () => {
    expect(suggestionsOf(await draft())).toEqual(['What are my rules?']);
  });
});

describe('what is suggested', () => {
  it('includes adding funds only where the agent can do it', async () => {
    expect(suggestionsOf(await live())).toContain('Add 100 USDC');
  });

  it('leaves it out for a strategy trading from a wallet', async () => {
    expect(suggestionsOf(await live('live'))).not.toContain('Add 100 USDC');
  });
});

describe("a strategy's story in the conversation", () => {
  it('starts with the idea, and says how it started with the real numbers', async () => {
    const record = await live();
    const [idea, ...rest] = milestonesOf(record);
    expect(idea).toMatchObject({ key: 'idea', from: 'user' });
    expect(blockOf(idea!.blocks, 'text')?.text).toBe(BRIEF);

    const started = rest.at(-1)!;
    expect(started.key).toBe('live');
    expect(textOf(started.blocks)).toMatch(/^Started on paper: bought \d+ stocks? for [\d.,]+ USDC on \d+ \w+\./);
  });

  it('keeps the milestones in the order they happened, whatever times the events were kept with', async () => {
    const record = await live();
    const times = milestonesOf(record).map(({ at }) => at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('has nothing to say before the strategy trades', async () => {
    expect(milestonesOf(await draft()).map(({ key }) => key)).toEqual(['idea']);
  });
});
