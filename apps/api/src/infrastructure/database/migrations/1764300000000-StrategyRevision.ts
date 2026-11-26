import { MigrationInterface, QueryRunner } from 'typeorm';

// How many times a strategy has been saved, so a save made from a stale read can be refused instead of overwriting what came after it.
// Strategies saved before this have revision 0, which is what a reader of them sends back.
export class StrategyRevision1764300000000 implements MigrationInterface {
  name = 'StrategyRevision1764300000000';

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE "strategies" ADD "revision" integer NOT NULL DEFAULT 0`);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE "strategies" DROP COLUMN "revision"`);
  }
}
