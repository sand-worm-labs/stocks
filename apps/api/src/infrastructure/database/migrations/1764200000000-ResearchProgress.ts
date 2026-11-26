import { MigrationInterface, QueryRunner } from 'typeorm';

// Where a research run that is waited on has got to, so the person can watch it and open each notebook as it is made.
export class ResearchProgress1764200000000 implements MigrationInterface {
  name = 'ResearchProgress1764200000000';

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE "research_runs" ADD "progress" jsonb`);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE "research_runs" DROP COLUMN "progress"`);
  }
}
