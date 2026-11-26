import { MigrationInterface, QueryRunner } from 'typeorm';

// The conversation a person has with the agent about one strategy: kept per strategy and per person, so it is the same wherever they open it.
// `milestone` names a message the app wrote for something that happened to the strategy (it was started, its research came in); a
// strategy has each milestone once. `proposal` is a money step the agent has asked the person to confirm, and what became of it.
export class AgentMessages1764500000000 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query(`CREATE TABLE "agent_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "strategy_id" text NOT NULL REFERENCES "strategies" ("id") ON DELETE CASCADE,
  "owner_id" uuid NOT NULL REFERENCES "profiles" ("user_id"),
  "author" text NOT NULL CHECK ("author" IN ('user', 'agent')),
  "blocks" jsonb NOT NULL,
  "proposal" jsonb,
  "milestone" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
)`);
    await db.query(`CREATE INDEX "agent_messages_strategy_idx" ON "agent_messages" ("strategy_id", "created_at", "id")`);
    await db.query(
      `CREATE UNIQUE INDEX "agent_messages_milestone_idx" ON "agent_messages" ("strategy_id", "milestone") WHERE "milestone" IS NOT NULL`,
    );
  }

  async down(db: QueryRunner) {
    await db.query('DROP TABLE "agent_messages"');
  }
}
