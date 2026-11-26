import { MigrationInterface, QueryRunner } from 'typeorm';

// A strategy that is deleted is first put in the trash, where it is kept (with its chat, activity and ledger) for 30 days and can be put back.
// `deleted_at` says when it went there; a strategy not in the trash has none. Deleting for good is a separate step that removes the rows.
export class StrategyTrash1764600000000 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query(`ALTER TABLE "strategies" ADD COLUMN "deleted_at" timestamptz`);
    await db.query(`CREATE INDEX "strategies_deleted_idx" ON "strategies" ("deleted_at") WHERE "deleted_at" IS NOT NULL`);
  }

  async down(db: QueryRunner) {
    await db.query('DROP INDEX "strategies_deleted_idx"');
    await db.query('ALTER TABLE "strategies" DROP COLUMN "deleted_at"');
  }
}
