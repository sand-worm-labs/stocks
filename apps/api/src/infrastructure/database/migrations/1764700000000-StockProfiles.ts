import { MigrationInterface, QueryRunner } from 'typeorm';

// What is known about the company behind each tokenized stock (its sector and industry), looked up once and kept, since it hardly ever
// changes and finding it takes one request a stock. A stock with no row has not been looked up yet.
export class StockProfiles1764700000000 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query(`CREATE TABLE "stock_profiles" (
  "ticker" text PRIMARY KEY,
  "name" text NOT NULL,
  "sector" text,
  "industry" text,
  "is_listed" boolean NOT NULL,
  "source" text NOT NULL,
  "fetched_at" timestamptz NOT NULL DEFAULT now()
)`);
  }

  async down(db: QueryRunner) {
    await db.query('DROP TABLE "stock_profiles"');
  }
}
