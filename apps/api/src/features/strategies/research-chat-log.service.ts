import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { MOST_PARTS, type ResearchChatLog, type RunPart, type RunStatus } from '@/features/research/types/research-chat.types';

// Writes at most this often while the agent works. Every word it streams is an event, which is far more than a page that looks every few
// seconds needs.
const WRITE_EVERY_MS = 1000;

type Waiting = { ownerId: string; strategyId: string; timer: NodeJS.Timeout; latest?: ResearchChatLog };

// What Sandworm's agent does while it researches, kept as a message in the strategy's own chat, so the person can follow it from here as they
// would in Sandworm. It is one message per run, written as the run goes and settled when it ends.
@Injectable()
export class ResearchChatLogService implements OnApplicationShutdown {
  private readonly logger = new Logger(ResearchChatLogService.name);
  private readonly waiting = new Map<string, Waiting>();

  constructor(private readonly dataSource: DataSource) {}

  onApplicationShutdown() {
    for (const { timer } of this.waiting.values()) clearTimeout(timer);
  }

  /// A run's log as it stands. While it is going the writes are spaced out, the first at once and the last never lost; one that has ended is
  /// written at once.
  async keep(ownerId: string, strategyId: string, log: ResearchChatLog) {
    const key = `${strategyId}:${log.runStartedAt}`;
    const slot = this.waiting.get(key);

    if (log.status !== 'running') {
      if (slot) clearTimeout(slot.timer);
      this.waiting.delete(key);
      return this.write(ownerId, strategyId, log);
    }
    if (slot) {
      slot.latest = log;
      return;
    }
    this.waiting.set(key, { ownerId, strategyId, timer: setTimeout(() => void this.flush(key), WRITE_EVERY_MS) });
    return this.write(ownerId, strategyId, log);
  }

  /// What an agent from outside tells of its work, added to the run's log: the steps go on the end, and the status and notebook are the latest said.
  /// Written at once, as an agent says little and each thing it says is worth seeing.
  async append(ownerId: string, strategyId: string, runStartedAt: string, told: { parts: RunPart[]; status?: RunStatus; notebookUrl?: string; runner?: 'sandworm' | 'agent' }) {
    const [row]: { blocks: { status?: RunStatus; notebookUrl?: string; runner?: 'sandworm' | 'agent'; parts?: RunPart[] }[] }[] = await this.dataSource.query(
      `SELECT "blocks" FROM "agent_messages" WHERE "strategy_id" = $1 AND "milestone" = $2`,
      [strategyId, `sandworm-chat:${runStartedAt}`],
    );
    const before = row?.blocks[0];
    await this.write(ownerId, strategyId, {
      runStartedAt,
      status: told.status ?? before?.status ?? 'running',
      notebookUrl: told.notebookUrl ?? before?.notebookUrl,
      runner: told.runner ?? before?.runner,
      // What is kept is the latest of it, as a chat is read from the bottom
      parts: [...(before?.parts ?? []), ...told.parts].slice(-MOST_PARTS),
    });
  }

  /// Marks a run as over, when it has a log and is still shown as going
  async finish(strategyId: string, runStartedAt: string, status: RunStatus) {
    await this.dataSource.query(
      `UPDATE "agent_messages" SET "blocks" = jsonb_set("blocks", '{0,status}', to_jsonb($3::text))
       WHERE "strategy_id" = $1 AND "milestone" = $2 AND "blocks"->0->>'status' = 'running'`,
      [strategyId, `sandworm-chat:${runStartedAt}`, status],
    );
  }

  /// Settles the runs of a strategy that are still shown as going, when whoever was running them is gone
  async stop(strategyId: string) {
    await this.dataSource.query(
      `UPDATE "agent_messages" SET "blocks" = jsonb_set("blocks", '{0,status}', '"failed"')
       WHERE "strategy_id" = $1 AND "milestone" LIKE 'sandworm-chat:%' AND "blocks"->0->>'status' = 'running'`,
      [strategyId],
    );
  }

  private async flush(key: string) {
    const slot = this.waiting.get(key);
    this.waiting.delete(key);
    if (slot?.latest) await this.write(slot.ownerId, slot.strategyId, slot.latest);
  }

  private async write(ownerId: string, strategyId: string, { runStartedAt, status, notebookUrl, runner, parts }: ResearchChatLog) {
    const blocks = [{ type: 'sandworm-run', status, notebookUrl, runner, parts }];
    try {
      await this.dataSource.query(
        `INSERT INTO "agent_messages" ("strategy_id", "owner_id", "author", "blocks", "milestone", "created_at")
         VALUES ($1, $2, 'agent', $3::jsonb, $4, $5)
         ON CONFLICT ("strategy_id", "milestone") WHERE "milestone" IS NOT NULL DO UPDATE SET "blocks" = EXCLUDED."blocks"`,
        [strategyId, ownerId, JSON.stringify(blocks), `sandworm-chat:${runStartedAt}`, runStartedAt],
      );
    } catch (error) {
      // The log is only for looking at: a strategy deleted while it runs, or a hiccup, must never stop the research
      this.logger.warn(`Could not keep the research log of ${strategyId}: ${error instanceof Error ? error.message : error}`);
    }
  }
}
