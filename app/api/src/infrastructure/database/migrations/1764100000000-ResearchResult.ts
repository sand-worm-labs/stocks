import { MigrationInterface, QueryRunner } from 'typeorm';

// What a research run that is waited on needs to keep: how it is run, the result it came back with, and why it failed if it did.
export class ResearchResult1764100000000 implements MigrationInterface {
  name = 'ResearchResult1764100000000';

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE "research_runs" ADD "mode" text`);
    await queryRunner.query(`ALTER TABLE "research_runs" ADD "result" jsonb`);
    await queryRunner.query(`ALTER TABLE "research_runs" ADD "error" text`);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE "research_runs" DROP COLUMN "error"`);
    await queryRunner.query(`ALTER TABLE "research_runs" DROP COLUMN "result"`);
    await queryRunner.query(`ALTER TABLE "research_runs" DROP COLUMN "mode"`);
  }
}
