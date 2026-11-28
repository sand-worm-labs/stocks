import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';

import { DEXSCREENER_URL, MARKET_FETCH } from '@/infrastructure/datasource/datasource.constants';
import { PoolQuote } from '@/infrastructure/datasource/datasource.types';
import { KeyedCache } from '@/infrastructure/datasource/cache/ttl-cache';

const ADDRESSES_PER_CALL = 30;
// Prices on a pool move all the time; this is how long one look is shared between everyone asking
const KEPT_MS = 10_000;

const pairsSchema = z.array(
  z.object({
    pairAddress: z.string(),
    dexId: z.string(),
    labels: z.array(z.string()).optional(),
    baseToken: z.object({ address: z.string() }),
    quoteToken: z.object({ address: z.string() }),
    priceUsd: z.string().optional(),
    priceChange: z.object({ m5: z.number().optional(), h1: z.number().optional(), h24: z.number().optional() }).optional(),
    volume: z.object({ h24: z.number().optional() }).optional(),
    liquidity: z.object({ usd: z.number().optional() }).optional(),
  }),
);
type Pair = z.infer<typeof pairsSchema>[number];

@Injectable()
export class DexScreenerService {
  private readonly cache = new KeyedCache<PoolQuote[]>(KEPT_MS, (key) => this.load(key.split(',')));

  constructor(@Inject(MARKET_FETCH) private readonly send: typeof fetch) {}

  /// Each token's deepest pool on Base, as it stands. A feed that fails gives what it last gave, or nothing.
  async quotes(addresses: string[]): Promise<PoolQuote[]> {
    const key = [...new Set(addresses.map((address) => address.toLowerCase()))].sort().join(',');
    if (!key) return [];
    return (await this.cache.get(key)) ?? [];
  }

  private async fetchPairs(addresses: string[]): Promise<Pair[]> {
    const response = await this.send(`${DEXSCREENER_URL}/${addresses.join(',')}`, { signal: AbortSignal.timeout(8_000) });
    return response.ok ? pairsSchema.parse(await response.json()) : [];
  }

  private async load(addresses: string[]): Promise<PoolQuote[]> {
    const chunks = Array.from({ length: Math.ceil(addresses.length / ADDRESSES_PER_CALL) }, (_, i) =>
      addresses.slice(i * ADDRESSES_PER_CALL, (i + 1) * ADDRESSES_PER_CALL),
    );
    const pairs = (await Promise.all(chunks.map((chunk) => this.fetchPairs(chunk)))).flat();

    const deepest = new Map<string, Pair>();
    for (const pair of pairs) {
      const key = pair.baseToken.address.toLowerCase();
      if (pair.priceUsd && (pair.liquidity?.usd ?? 0) >= (deepest.get(key)?.liquidity?.usd ?? -1)) deepest.set(key, pair);
    }

    return Array.from(deepest, ([address, pair]) => ({
      address,
      pair: pair.pairAddress.toLowerCase(),
      dex: pair.dexId,
      version: pair.labels?.[0],
      quote: pair.quoteToken.address.toLowerCase(),
      price: Number(pair.priceUsd),
      change5m: pair.priceChange?.m5,
      change1h: pair.priceChange?.h1,
      change24h: pair.priceChange?.h24,
      volume24h: pair.volume?.h24,
      liquidity: pair.liquidity?.usd,
    }));
  }
}
