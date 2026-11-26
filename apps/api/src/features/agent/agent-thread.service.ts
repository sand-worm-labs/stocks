import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { StocksService } from '@/features/market/stocks.service';
import type { Stock } from '@/features/market/types/market.types';
import { StrategyEngine } from '@/features/strategies/strategy-engine.service';
import { StrategyError } from '@/features/strategies/lifecycle/strategy-lifecycle';
import { rulesView } from '@/features/strategies/rules/rules-view';
import { changeFunds, sellStocks } from '@/features/strategies/trading/money';
import type { StrategyRecord } from '@/features/strategies/types/strategy-record';

import { answer } from './conversation/answer';
import type { Context } from './conversation/context';
import { milestonesOf } from './conversation/milestones';
import { note, offer, reply, say } from './conversation/replies';
import { standingOf, usdc } from './conversation/strategy-facts';
import { suggestionsOf } from './conversation/suggestions';
import { understand } from './conversation/understand';
import { AgentMessageRow } from './entities/agent-message.entity';
import type { AgentMessage, ProposalStatus, ProposedStep, Reply } from './types/agent-message.types';

// A step the agent proposed is not carried out on a confirm that comes much later: prices have moved since it was worked out
export const PROPOSAL_LIFETIME_MS = 30 * 60 * 1000;
// What is read back when the conversation is opened; a conversation is long-lived, and the page needs only its latest part
const MOST_MESSAGES = 200;

export type Thread = { messages: AgentMessage[]; suggestions: string[] };

// The ids of the rows an UPDATE ... RETURNING "id" changed. For an UPDATE the driver answers with the rows and then the count, so the rows are
// the first of the two; reading the answer as the rows themselves would count a change that never happened.
async function idsChangedBy(manager: EntityManager, sql: string, params: unknown[]) {
  const [rows]: [{ id: string }[], number] = await manager.query(sql, params);
  return rows.map(({ id }) => id);
}

export function toMessage(row: AgentMessageRow): AgentMessage {
  const proposal = row.proposal;
  const blocks = proposal
    ? [...row.blocks, { type: 'proposal' as const, id: row.id, title: proposal.title, rows: proposal.rows, status: proposal.status, confirmLabel: proposal.confirmLabel }]
    : row.blocks;
  return { id: row.id, from: row.author, blocks, at: row.createdAt.toISOString() };
}

// The conversation a person has with the agent about one of their strategies. It is kept, so it is the same whenever and wherever they open
// the strategy, and everything the agent says comes from that strategy as it stands: its rules, what it holds, what it has done.
@Injectable()
export class AgentThread {
  constructor(
    private readonly dataSource: DataSource,
    private readonly engine: StrategyEngine,
    private readonly stocks: StocksService,
  ) {}

  private get messages() {
    return this.dataSource.getRepository(AgentMessageRow);
  }

  /// The conversation so far, with what has happened to the strategy put into it
  async open(ownerId: string, strategyId: string): Promise<Thread> {
    const record = await this.strategyOf(ownerId, strategyId);
    await this.noteMilestones(record);
    const rows = await this.messages.find({ where: { strategyId }, order: { createdAt: 'DESC', id: 'DESC' }, take: MOST_MESSAGES });
    return { messages: rows.reverse().map(toMessage), suggestions: suggestionsOf(record) };
  }

  /// One thing the person says, and the agent's answer to it. A step that moves money is only proposed: it is carried out by `decide`.
  async say(ownerId: string, strategyId: string, text: string) {
    const context = await this.contextOf(ownerId, strategyId);
    const standing = standingOf(context.record, context.stocks);
    const intent = understand(text, { held: standing.positions, listed: context.stocks });
    const said = answer(intent, context);

    const askedAt = new Date();
    const answeredAt = new Date(askedAt.getTime() + 1);
    return this.dataSource.transaction(async (tx) => {
      const rows = tx.getRepository(AgentMessageRow);
      const superseded = said.proposal ? await this.supersedePending(tx, strategyId) : [];
      const asked = await rows.save(rows.create({ strategyId, ownerId, author: 'user', blocks: [say(text)], createdAt: askedAt }));
      const answered = await rows.save(rows.create(this.rowOf(ownerId, strategyId, said, answeredAt)));
      return { messages: [toMessage(asked), toMessage(answered)], superseded };
    });
  }

  /// The person's answer to a step the agent proposed. A step is carried out once, by the first confirm, and only while it is fresh.
  async decide(ownerId: string, strategyId: string, messageId: string, decision: 'confirm' | 'cancel') {
    await this.strategyOf(ownerId, strategyId);
    const proposed = await this.messages.findOneBy({ id: messageId, strategyId, ownerId });
    if (!proposed?.proposal) throw new StrategyError('That is no longer in the conversation', 404);

    const isStale = Date.now() - proposed.createdAt.getTime() > PROPOSAL_LIFETIME_MS;
    if (decision === 'cancel' || isStale) {
      const isClaimed = await this.claim(messageId, 'pending', 'cancelled');
      const text = decision === 'cancel' ? 'Cancelled. Nothing was changed.' : 'That was a while ago and prices have moved, so I did not do it. Ask me again and I will work it out afresh.';
      return this.answered(ownerId, strategyId, messageId, isClaimed ? reply(say(text), offer('How is it doing?')) : undefined);
    }

    // Two confirms at once (a double click, two tabs) are one: only the first finds it pending
    const isFirst = await this.claim(messageId, 'pending', 'working');
    if (!isFirst) return this.answered(ownerId, strategyId, messageId, undefined);

    try {
      const done = await this.carryOut(ownerId, strategyId, proposed.proposal.step);
      await this.claim(messageId, 'working', 'done');
      return this.answered(ownerId, strategyId, messageId, done);
    } catch (error) {
      await this.claim(messageId, 'working', 'failed');
      if (!(error instanceof StrategyError)) throw error;
      return this.answered(ownerId, strategyId, messageId, reply(note("That didn't go through", error.message, 'negative'), offer('How is it doing?')));
    }
  }

  private async strategyOf(ownerId: string, strategyId: string) {
    const { steps } = this.engine;
    return steps.settle(await steps.owned(ownerId, strategyId));
  }

  private async contextOf(ownerId: string, strategyId: string): Promise<Context> {
    const record = await this.strategyOf(ownerId, strategyId);
    // The agent answers without prices when the market is down: what was paid stands in for them
    const stocks: Stock[] = await this.stocks.source.getStocks().catch(() => []);
    return { record, stocks, rules: rulesView(record, record.status === 'live' ? stocks : []), now: new Date() };
  }

  private rowOf(ownerId: string, strategyId: string, said: Reply, createdAt: Date) {
    const proposal = said.proposal && { ...said.proposal, status: 'pending' as ProposalStatus };
    return { strategyId, ownerId, author: 'agent' as const, blocks: said.blocks, proposal: proposal ?? null, createdAt };
  }

  // Older steps still waiting for a confirm are off the table once a new one is proposed, so only one button is ever live
  private supersedePending(manager: EntityManager, strategyId: string) {
    return idsChangedBy(
      manager,
      `UPDATE "agent_messages" SET "proposal" = jsonb_set("proposal", '{status}', '"cancelled"')
       WHERE "strategy_id" = $1 AND "proposal"->>'status' = 'pending' RETURNING "id"`,
      [strategyId],
    );
  }

  // Moves a step from one state to the next if it is in the one expected, which is how a step is done once. Says whether it was.
  private async claim(messageId: string, from: ProposalStatus, to: ProposalStatus) {
    const claimed = await idsChangedBy(
      this.dataSource.manager,
      `UPDATE "agent_messages" SET "proposal" = jsonb_set("proposal", '{status}', to_jsonb($3::text))
       WHERE "id" = $1 AND "proposal"->>'status' = $2 RETURNING "id"`,
      [messageId, from, to],
    );
    return claimed.length > 0;
  }

  // The proposal's own message as it stands now, and the agent's answer to the decision when there is one
  private async answered(ownerId: string, strategyId: string, messageId: string, said?: Reply) {
    const proposal = await this.messages.findOneByOrFail({ id: messageId });
    const messages = [toMessage(proposal)];
    if (!said) return { messages };

    const row = await this.messages.save(this.messages.create(this.rowOf(ownerId, strategyId, said, new Date())));
    return { messages: [...messages, toMessage(row)] };
  }

  // The step, done the way the app's own buttons do it, so the chat and the page can't disagree about what is allowed
  private async carryOut(ownerId: string, strategyId: string, step: ProposedStep): Promise<Reply> {
    const { steps } = this.engine;
    if (step.kind === 'add-funds') {
      const { cash, bought } = await changeFunds(steps, ownerId, strategyId, { direction: 'add', amount: step.amount });
      const stocks = `${bought} stock${bought === 1 ? '' : 's'}`;
      return reply(say(`Added ${usdc(step.amount)}. It bought ${stocks}, and ${usdc(cash)} is in cash.`), offer('How is it doing?', 'What do I hold?'));
    }
    if (step.kind === 'take-out-cash') {
      const { cash } = await changeFunds(steps, ownerId, strategyId, { direction: 'remove', amount: step.amount });
      return reply(say(`Took out ${usdc(step.amount)}. ${usdc(cash)} is left in cash.`), offer('How is it doing?'));
    }
    const { cash, received } = await sellStocks(steps, ownerId, strategyId, { symbols: step.symbols, share: step.share });
    return reply(say(`Sold. You received ${usdc(received)} after fees, and ${usdc(cash)} is now in cash.`), offer('How is it doing?', 'What do I hold?'));
  }

  // What happened to the strategy, put into the conversation once each, at the time it happened. Only a strategy that is trading has a story
  // beyond what its own pages say.
  private async noteMilestones(record: StrategyRecord) {
    if (record.status !== 'live') return;
    const rows = milestonesOf(record).map(({ key, from, blocks, at }) => ({
      strategyId: record.id,
      ownerId: record.ownerId,
      author: from,
      blocks,
      milestone: key,
      createdAt: at,
    }));
    // A strategy has each milestone once, so asking again, or two pages asking at once, adds nothing
    await this.messages.createQueryBuilder().insert().values(rows).orIgnore().execute();
  }
}
