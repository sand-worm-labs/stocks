import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { COINBASE_STOCKS_URL, MARKET_FETCH } from '@/infrastructure/datasource/datasource.constants';
import { TtlCache } from '@/infrastructure/datasource/cache/ttl-cache';
import type { Listing, ListingSource } from '@/features/market/universe/universe.types';

const PAGE_SIZE = 500;
// A page that never ends is a feed gone wrong, not a list that long
const MOST_PAGES = 20;
const KEPT_MS = 10 * 60_000;

const tokenSchema = z.object({
  contract_address: z.string(),
  symbol: z.string(),
  name: z.string(),
  decimals: z.number().optional(),
  multiplier: z.number().optional(),
  isin: z.string().optional(),
  description: z.string().optional(),
  icon_url: z.string().optional(),
  total_supply: z.number().optional(),
  first_mint_date: z.string().optional(),
  paused_features: z.array(z.unknown()).optional(),
  nav_price: z.number().optional(),
});
const pageSchema = z.object({ tokens: z.array(tokenSchema).default([]), next_page_token: z.string().optional() });

// The stocks Coinbase has tokenized on Base: the list the Base docs point to (docs.base.org/sdks/tokenized-stocks). It is public and needs no key.
// A token is listed before it is minted, so a stock can be in the list and not yet be bought.
@Injectable()
export class TokenizedStocksService implements ListingSource {
  readonly name = 'coinbase';
  private readonly cache = new TtlCache<Listing[]>(KEPT_MS, () => this.load());

  constructor(@Inject(MARKET_FETCH) private readonly send: typeof fetch) {}

  /// Every stock on the list, as it stands. A feed that fails gives what it last gave, or nothing.
  async listings(): Promise<Listing[]> {
    return (await this.cache.get()) ?? [];
  }

  private async load(): Promise<Listing[]> {
    const listings: Listing[] = [];
    let pageToken: string | undefined;

    for (let page = 0; page < MOST_PAGES; page++) {
      const query = new URLSearchParams({ page_size: String(PAGE_SIZE) });
      if (pageToken) query.set('page_token', pageToken);

      const response = await this.send(`${COINBASE_STOCKS_URL}?${query}`, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`Coinbase's tokenized stocks answered ${response.status}`);

      const { tokens, next_page_token: next } = pageSchema.parse(await response.json());
      listings.push(...tokens.map(listingOf));
      if (!next) return listings;
      pageToken = next;
    }
    return listings;
  }
}

function listingOf(token: z.infer<typeof tokenSchema>): Listing {
  return {
    source: 'coinbase',
    symbol: token.symbol,
    name: token.name,
    address: token.contract_address.toLowerCase(),
    decimals: token.decimals,
    multiplier: token.multiplier,
    isin: token.isin,
    description: token.description,
    iconUrl: token.icon_url,
    totalSupply: token.total_supply,
    firstMintDate: token.first_mint_date,
    isPaused: (token.paused_features?.length ?? 0) > 0,
    navPrice: token.nav_price,
  };
}
