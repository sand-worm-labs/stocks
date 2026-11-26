import { MigrationInterface, QueryRunner } from 'typeorm';

// The first tables, the same as the ones the Next app made with Drizzle (drizzle/0000_init.sql), so what is stored does not change
// shape in the move. Every later change is a new migration beside this one, generated and read before it is committed.
const statements = [
  `CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"strategy_id" text,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"data" jsonb DEFAULT '{}' NOT NULL,
	"ledger_id" bigint,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);`,
  `CREATE TABLE "activity_state" (
	"user_id" uuid NOT NULL,
	"activity_id" uuid NOT NULL,
	"read_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	CONSTRAINT "activity_state_user_id_activity_id_pk" PRIMARY KEY("user_id","activity_id")
);`,
  `CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room" text NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"text" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_messages_room" CHECK ("chat_messages"."room" ~ '^0x[0-9a-f]{40}$'),
	CONSTRAINT "chat_messages_length" CHECK (char_length("chat_messages"."text") <= 280)
);`,
  `CREATE TABLE "ledger" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ledger_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"strategy_id" text NOT NULL,
	"kind" text NOT NULL,
	"symbol" text,
	"units" numeric(38, 18),
	"price" numeric(24, 8),
	"usdc" numeric(24, 6) NOT NULL,
	"fee" numeric(24, 6) DEFAULT 0 NOT NULL,
	"impact" numeric(12, 8),
	"tx_hash" text,
	"chain_id" integer,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_kind" CHECK ("ledger"."kind" in ('deposit', 'withdraw', 'buy', 'sell', 'fee')),
	CONSTRAINT "ledger_trade_has_stock" CHECK (("ledger"."kind" in ('buy', 'sell')) = ("ledger"."symbol" is not null and "ledger"."units" is not null))
);`,
  `CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"region" text,
	"interests" text[] DEFAULT '{}' NOT NULL,
	"onboarded_at" timestamp with time zone,
	"welcome_seen_at" timestamp with time zone,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);`,
  `CREATE TABLE "research_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategy_id" text NOT NULL,
	"version" integer NOT NULL,
	"source" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expected_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"report" jsonb,
	"orders" jsonb
);`,
  `CREATE TABLE "strategies" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"brief" text NOT NULL,
	"status" text NOT NULL,
	"stage" text,
	"mode" text,
	"current_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	CONSTRAINT "strategies_mode" CHECK ("strategies"."mode" in ('paper', 'wallet'))
);`,
  `CREATE TABLE "strategy_versions" (
	"strategy_id" text NOT NULL,
	"version" integer NOT NULL,
	"rules" jsonb NOT NULL,
	"spec" jsonb NOT NULL,
	"summary" jsonb NOT NULL,
	"assumption" text DEFAULT '' NOT NULL,
	"budget" numeric(24, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strategy_versions_strategy_id_version_pk" PRIMARY KEY("strategy_id","version")
);`,
  `CREATE TABLE "trade_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"strategy_id" text NOT NULL,
	"wallet" text NOT NULL,
	"chain_id" integer NOT NULL,
	"max_amount" numeric(24, 6) NOT NULL,
	"message" text NOT NULL,
	"signature" text NOT NULL,
	"balance_seen" numeric(24, 6) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trade_approvals_strategy_unique" UNIQUE("strategy_id"),
	CONSTRAINT "trade_approvals_wallet_lower" CHECK ("trade_approvals"."wallet" = lower("trade_approvals"."wallet"))
);`,
  `CREATE TABLE "wallets" (
	"user_id" uuid NOT NULL,
	"address" text NOT NULL,
	"chain_id" integer NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_user_id_chain_id_address_pk" PRIMARY KEY("user_id","chain_id","address"),
	CONSTRAINT "wallets_address_lower" CHECK ("wallets"."address" = lower("wallets"."address"))
);`,
  `ALTER TABLE "activity" ADD CONSTRAINT "activity_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;`,
  `ALTER TABLE "activity" ADD CONSTRAINT "activity_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE set null ON UPDATE no action;`,
  `ALTER TABLE "activity" ADD CONSTRAINT "activity_ledger_id_ledger_id_fk" FOREIGN KEY ("ledger_id") REFERENCES "public"."ledger"("id") ON DELETE no action ON UPDATE no action;`,
  `ALTER TABLE "activity_state" ADD CONSTRAINT "activity_state_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;`,
  `ALTER TABLE "activity_state" ADD CONSTRAINT "activity_state_activity_id_activity_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activity"("id") ON DELETE cascade ON UPDATE no action;`,
  `ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;`,
  `ALTER TABLE "ledger" ADD CONSTRAINT "ledger_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE cascade ON UPDATE no action;`,
  `ALTER TABLE "research_runs" ADD CONSTRAINT "research_runs_strategy_id_version_strategy_versions_strategy_id_version_fk" FOREIGN KEY ("strategy_id","version") REFERENCES "public"."strategy_versions"("strategy_id","version") ON DELETE cascade ON UPDATE no action;`,
  `ALTER TABLE "strategies" ADD CONSTRAINT "strategies_owner_id_profiles_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("user_id") ON DELETE no action ON UPDATE no action;`,
  `ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE cascade ON UPDATE no action;`,
  `ALTER TABLE "trade_approvals" ADD CONSTRAINT "trade_approvals_strategy_id_strategies_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."strategies"("id") ON DELETE cascade ON UPDATE no action;`,
  `ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_profiles_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE cascade ON UPDATE no action;`,
  `CREATE INDEX "activity_user_idx" ON "activity" USING btree ("user_id","at" DESC NULLS LAST);`,
  `CREATE INDEX "activity_strategy_idx" ON "activity" USING btree ("strategy_id","at" DESC NULLS LAST);`,
  `CREATE INDEX "chat_messages_room_idx" ON "chat_messages" USING btree ("room","at" DESC NULLS LAST);`,
  `CREATE INDEX "ledger_strategy_idx" ON "ledger" USING btree ("strategy_id","at");`,
  `CREATE UNIQUE INDEX "ledger_receipt_unique" ON "ledger" USING btree ("chain_id","tx_hash","symbol") WHERE "ledger"."tx_hash" is not null;`,
  `CREATE INDEX "research_runs_strategy_idx" ON "research_runs" USING btree ("strategy_id","started_at" DESC NULLS LAST);`,
  `CREATE INDEX "strategies_owner_idx" ON "strategies" USING btree ("owner_id","created_at" DESC NULLS LAST);`,
];

export class Init1764000000000 implements MigrationInterface {
  name = 'Init1764000000000';

  async up(queryRunner: QueryRunner) {
    for (const statement of statements) await queryRunner.query(statement);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(
      'DROP TABLE IF EXISTS chat_messages, activity_state, activity, ledger, trade_approvals, research_runs, strategy_versions, strategies, wallets, profiles CASCADE',
    );
  }
}
