import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { YahooService } from '@/infrastructure/datasource/yahoo/yahoo.service';
import type { CompanyProfile } from '@/features/market/universe/universe.types';

import { profileFrom } from './company-profile';

const DAY_MS = 24 * 60 * 60_000;
// A company's sector hardly moves; a stock found not to be listed may be listed by next month
const LISTED_KEPT_MS = 90 * DAY_MS;
const NOT_LISTED_KEPT_MS = 14 * DAY_MS;
// Yahoo refuses a crowd, so profiles are looked up a few at a time
const AT_ONCE = 3;
const PAUSE_MS = 250;

type Row = { ticker: string; sector: string | null; industry: string | null; is_listed: boolean; fetched_at: Date };
export type ProfileRequest = { ticker: string; name: string };

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class StockProfilesService {
  private readonly logger = new Logger(StockProfilesService.name);
  private filling: Promise<void> | undefined;

  constructor(
    private readonly dataSource: DataSource,
    private readonly yahoo: YahooService,
  ) {}

  /// The profile of every stock looked up so far, by ticker
  async known(): Promise<Map<string, CompanyProfile>> {
    const rows: Row[] = await this.dataSource.query('SELECT ticker, sector, industry, is_listed, fetched_at FROM stock_profiles');
    return new Map(rows.map((row) => [row.ticker, { isListed: row.is_listed, sector: row.sector ?? undefined, industry: row.industry ?? undefined }]));
  }

  /// Looks up the stocks that have no profile yet, or one that has gone out of date, in the background. One run at a time, however often asked.
  fillMissing(stocks: ProfileRequest[]) {
    this.filling ??= this.fill(stocks)
      .catch((error: unknown) => this.logger.error(error))
      .finally(() => {
        this.filling = undefined;
      });
  }

  /// For a test or a script: resolves when the run in progress is done
  whenFilled() {
    return this.filling ?? Promise.resolve();
  }

  private async fill(stocks: ProfileRequest[]) {
    const rows: Row[] = await this.dataSource.query('SELECT ticker, sector, industry, is_listed, fetched_at FROM stock_profiles');
    const kept = new Map(rows.map((row) => [row.ticker, row]));
    const now = Date.now();
    const due = stocks.filter(({ ticker }) => {
      const row = kept.get(ticker);
      if (!row) return true;
      return now - row.fetched_at.getTime() > (row.is_listed ? LISTED_KEPT_MS : NOT_LISTED_KEPT_MS);
    });
    if (!due.length) return;

    this.logger.log(`Looking up the sector of ${due.length} stocks`);
    let done = 0;
    for (let i = 0; i < due.length; i += AT_ONCE) {
      const batch = due.slice(i, i + AT_ONCE);
      const found = await Promise.all(batch.map((stock) => this.lookUp(stock)));
      done += found.filter(Boolean).length;
      await wait(PAUSE_MS);
    }
    this.logger.log(`Found a profile for ${done} of ${due.length} stocks`);
  }

  private async lookUp({ ticker, name }: ProfileRequest) {
    const byTicker = profileFrom(ticker, name, await this.yahoo.search(ticker.replace(".", "-")));
    if (!byTicker) return false;
    // Nothing under the token's ticker: the share may be listed under another, so before it is called pre-IPO it is looked for by its name
    const profile = byTicker.isListed ? byTicker : (profileFrom(ticker, name, await this.yahoo.search(name), true) ?? byTicker);

    await this.dataSource.query(
      `INSERT INTO stock_profiles (ticker, name, sector, industry, is_listed, source, fetched_at)
       VALUES ($1, $2, $3, $4, $5, 'yahoo', now())
       ON CONFLICT (ticker) DO UPDATE SET name = $2, sector = $3, industry = $4, is_listed = $5, source = 'yahoo', fetched_at = now()`,
      [ticker, name, profile.sector ?? null, profile.industry ?? null, profile.isListed],
    );
    return true;
  }
}
