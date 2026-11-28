import { Inject, Injectable } from '@nestjs/common';

import { TtlCache } from '@/infrastructure/datasource/cache/ttl-cache';
import { DexScreenerService } from '@/infrastructure/datasource/dexscreener/dexscreener.service';
import type { Stock } from '@/features/market/types/market.types';
import { underlyingTicker } from '@/features/market/stock';

import { StockProfilesService } from '../profiles/stock-profiles.service';
import { buildStocks } from './build-stocks';
import { LISTING_SOURCES, type ListingSource } from './universe.types';

// How long a look at how every token trades is shared between everyone asking
const KEPT_MS = 60_000;

// Every stock the product could offer, from every place that lists them, with how each trades and what company it is. This is the one list the
// markets pages, the strategy designer and the research read, so none of them keeps a list of its own.
@Injectable()
export class UniverseService {
  private readonly cache = new TtlCache<Stock[]>(KEPT_MS, () => this.load(), 30_000);

  constructor(
    @Inject(LISTING_SOURCES) private readonly sources: ListingSource[],
    private readonly pools: DexScreenerService,
    private readonly profiles: StockProfilesService,
  ) {}

  /// The stocks as they stand. Nothing when no source can be reached (and none has ever been): an empty list is the truth, not a made-up one.
  async stocks(): Promise<Stock[]> {
    return (await this.cache.get()) ?? [];
  }

  private async load(): Promise<Stock[]> {
    const lists = await Promise.all(this.sources.map((source) => source.listings()));
    const listings = lists.flat();
    const [pools, profiles] = await Promise.all([this.pools.quotes(listings.map(({ address }) => address)), this.profiles.known()]);

    this.profiles.fillMissing(listings.map(({ symbol, name }) => ({ ticker: underlyingTicker(symbol), name })));
    return buildStocks({ listings, pools: new Map(pools.map((pool) => [pool.address, pool])), profiles });
  }
}
