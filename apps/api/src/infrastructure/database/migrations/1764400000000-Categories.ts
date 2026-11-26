import { MigrationInterface, QueryRunner } from 'typeorm';

// The categories stocks are grouped into, and which stocks are in each: edited here in the database, not in the code. What is inserted is
// what the code used to list; from now on a change is a change to these rows.
export class Categories1764400000000 implements MigrationInterface {
  async up(db: QueryRunner) {
    await db.query(`CREATE TABLE "categories" (
  "id" text PRIMARY KEY,
  "label" text NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  "is_hot" boolean NOT NULL DEFAULT false,
  "is_interest" boolean NOT NULL DEFAULT false
)`);
    await db.query(`CREATE TABLE "category_stocks" (
  "category_id" text NOT NULL REFERENCES "categories" ("id") ON DELETE CASCADE,
  "ticker" text NOT NULL,
  "position" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("category_id", "ticker")
)`);
    await db.query(`INSERT INTO "categories" ("id", "label", "position", "is_hot", "is_interest") VALUES
  ('trump', 'Trump-Affiliated', 10, true, false),
  ('ai', 'AI & Chips', 20, true, true),
  ('crypto', 'Crypto Treasuries & Miners', 30, true, false),
  ('pre-ipo', 'Pre-IPO', 40, true, false),
  ('big-tech', 'Big Tech', 50, false, true),
  ('robotics', 'Robotics', 60, false, true),
  ('space', 'Space & Defense', 70, false, true),
  ('hardware', 'Hardware & Memory', 80, false, true),
  ('quantum', 'Quantum', 90, false, false),
  ('ev-auto', 'EV & Auto', 100, false, false),
  ('preferred', 'Preferred Shares', 110, false, false),
  ('finance', 'Finance', 120, false, false),
  ('consumer', 'Consumer', 130, false, false),
  ('health', 'Health & Pharma', 140, false, false),
  ('energy', 'Energy & Materials', 150, false, false),
  ('china', 'China', 160, false, false)`);
    await db.query(`INSERT INTO "category_stocks" ("category_id", "ticker", "position") VALUES
  ('trump', 'DJT', 1), ('trump', 'ABTC', 2), ('trump', 'XXI', 3),
  ('ai', 'NVDA', 1), ('ai', 'AMD', 2), ('ai', 'AVGO', 3), ('ai', 'MU', 4), ('ai', 'INTC', 5), ('ai', 'MRVL', 6), ('ai', 'TSM', 7), ('ai', 'ASML', 8), ('ai', 'ARM', 9), ('ai', 'SNDK', 10), ('ai', 'WDC', 11), ('ai', 'SKHY', 12), ('ai', 'AAOI', 13), ('ai', 'LITE', 14), ('ai', 'PLTR', 15), ('ai', 'SOUN', 16), ('ai', 'ORCL', 17), ('ai', 'CRWV', 18), ('ai', 'IREN', 19), ('ai', 'APLD', 20), ('ai', 'DELL', 21), ('ai', 'ANT', 22), ('ai', 'GOOGL', 23),
  ('crypto', 'MSTR', 1), ('crypto', 'COIN', 2), ('crypto', 'HOOD', 3), ('crypto', 'CRCL', 4), ('crypto', 'MARA', 5), ('crypto', 'RIOT', 6), ('crypto', 'CLSK', 7), ('crypto', 'HUT', 8), ('crypto', 'BTBT', 9), ('crypto', 'CIFR', 10), ('crypto', 'CORZ', 11), ('crypto', 'WULF', 12), ('crypto', 'BMNR', 13), ('crypto', 'NAKA', 14), ('crypto', 'DFDV', 15), ('crypto', 'SBET', 16), ('crypto', 'GLXY', 17), ('crypto', 'GEMI', 18), ('crypto', 'BLSH', 19), ('crypto', 'BTGO', 20), ('crypto', 'BKKT', 21), ('crypto', 'ETOR', 22), ('crypto', 'EXOD', 23), ('crypto', 'BCOIN', 24),
  ('pre-ipo', 'ANT', 1), ('pre-ipo', 'SPCX', 2),
  ('big-tech', 'AAPL', 1), ('big-tech', 'MSFT', 2), ('big-tech', 'GOOGL', 3), ('big-tech', 'GOOG', 4), ('big-tech', 'AMZN', 5), ('big-tech', 'META', 6), ('big-tech', 'NFLX', 7), ('big-tech', 'TSLA', 8), ('big-tech', 'NVDA', 9),
  ('robotics', 'NVDA', 1), ('robotics', 'AMZN', 2), ('robotics', 'GOOGL', 3), ('robotics', 'TSLA', 4), ('robotics', 'ISRG', 5), ('robotics', 'SYM', 6), ('robotics', 'TER', 7), ('robotics', 'ROK', 8),
  ('space', 'SPCX', 1), ('space', 'RKLB', 2), ('space', 'ASTS', 3), ('space', 'KTOS', 4), ('space', 'LMT', 5), ('space', 'AVAV', 6), ('space', 'BA', 7),
  ('hardware', 'SNDK', 1), ('hardware', 'AAPL', 2),
  ('quantum', 'IONQ', 1), ('quantum', 'RGTI', 2), ('quantum', 'QBTS', 3), ('quantum', 'QUBT', 4),
  ('ev-auto', 'TSLA', 1), ('ev-auto', 'NIO', 2), ('ev-auto', 'LI', 3), ('ev-auto', 'XPEV', 4), ('ev-auto', 'F', 5), ('ev-auto', 'QS', 6),
  ('preferred', 'SATA', 1), ('preferred', 'STRC', 2), ('preferred', 'STRK', 3), ('preferred', 'STRD', 4), ('preferred', 'STRF', 5),
  ('finance', 'JPM', 1), ('finance', 'GS', 2), ('finance', 'BAC', 3), ('finance', 'V', 4), ('finance', 'MA', 5), ('finance', 'AXP', 6), ('finance', 'BLK', 7), ('finance', 'PYPL', 8), ('finance', 'XYZ', 9), ('finance', 'CME', 10), ('finance', 'CBOE', 11), ('finance', 'IBKR', 12), ('finance', 'BRK.B', 13), ('finance', 'FITB', 14),
  ('consumer', 'KO', 1), ('consumer', 'MCD', 2), ('consumer', 'NKE', 3), ('consumer', 'WMT', 4), ('consumer', 'COST', 5), ('consumer', 'SBUX', 6), ('consumer', 'YUM', 7), ('consumer', 'PG', 8), ('consumer', 'DIS', 9), ('consumer', 'PM', 10), ('consumer', 'UL', 11), ('consumer', 'BUD', 12), ('consumer', 'CAKE', 13), ('consumer', 'WEN', 14), ('consumer', 'TJX', 15), ('consumer', 'HD', 16),
  ('health', 'LLY', 1), ('health', 'NVO', 2), ('health', 'MRNA', 3), ('health', 'PFE', 4), ('health', 'JNJ', 5), ('health', 'MRK', 6), ('health', 'ABBV', 7), ('health', 'AZN', 8), ('health', 'ABT', 9), ('health', 'HIMS', 10), ('health', 'NVAX', 11),
  ('energy', 'CVX', 1), ('energy', 'XOM', 2), ('energy', 'SHEL', 3), ('energy', 'VALE', 4), ('energy', 'MP', 5), ('energy', 'ERO', 6), ('energy', 'BE', 7), ('energy', 'OKLO', 8),
  ('china', 'BABA', 1), ('china', 'PDD', 2), ('china', 'BIDU', 3), ('china', 'JD', 4), ('china', 'TCEHY', 5), ('china', 'NIO', 6), ('china', 'LI', 7), ('china', 'XPEV', 8), ('china', 'BILI', 9), ('china', 'HSAI', 10), ('china', 'WRD', 11)`);
  }

  async down(db: QueryRunner) {
    await db.query('DROP TABLE "category_stocks"');
    await db.query('DROP TABLE "categories"');
  }
}
