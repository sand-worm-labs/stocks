import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { z } from 'zod';

import { describeToken } from './describe-token';
import { readDisk, writeDisk } from '@/infrastructure/datasource/cache/disk-cache';
import { COINGECKO_URL, MARKET_FETCH } from '@/infrastructure/datasource/datasource.constants';
import { BaseToken, HistoryWindow, PricePoint } from '@/infrastructure/datasource/datasource.types';
import { KeyedCache, TtlCache } from '@/infrastructure/datasource/cache/ttl-cache';
import { settings } from '@/config/settings';

const PAGE_SIZE = 250;
const MAX_PAGES = 8;
const IDS_PER_REQUEST = 150;
const SERIES_STEP = 6;
const RATE_LIMIT_WAIT_MS = 20_000;
const MINUTES = 60_000;
const DAY_MS = 24 * 60 * MINUTES;
const DAYS = { day: 1, week: 7, month: 30 } as const;
const MARKETS = '/coins/markets?vs_currency=usd&per_page=250';

const number = z.number().nullable().optional();
const marketsSchema = z.array(
  z.object({
    id: z.string(),
    symbol: z.string(),
    name: z.string(),
    image: z.string().nullish(),
    current_price: number,
    market_cap: number,
    total_volume: number,
    price_change_percentage_1h_in_currency: number,
    price_change_percentage_24h_in_currency: number,
    price_change_percentage_7d_in_currency: number,
    sparkline_in_7d: z.object({ price: z.array(z.number()) }).nullish(),
  }),
);
const tokenHistorySchema = z.object({ prices: z.array(z.tuple([z.number(), z.number()])) });

const toFraction = (percent?: number | null) => (percent == null ? undefined : percent / 100);

@Injectable()
export class CoinGeckoService implements OnModuleInit {
  private readonly tokenCache = new TtlCache<BaseToken[]>(MINUTES, () => this.loadTokens());
  private readonly historyCache = new KeyedCache<PricePoint[]>(5 * MINUTES, (key) => this.loadHistory(key));
  private readonly ethCache = new TtlCache<number | undefined>(MINUTES, () => this.loadEthPrice());

  constructor(@Inject(MARKET_FETCH) private readonly send: typeof fetch) {}

  /// The first list takes half a minute, so it is started when the API starts and not when the first page asks for it
  onModuleInit() {
    void this.tokens();
  }

  /// Every tokenized stock on Base, biggest first. A feed that fails gives the list it last had.
  async tokens(): Promise<BaseToken[]> {
    return (await this.tokenCache.get()) ?? [];
  }

  async tokenHistory(tokenId: string, window: HistoryWindow): Promise<PricePoint[]> {
    return (await this.historyCache.get(`${window}|${tokenId}`)) ?? [];
  }

  async ethPrice(): Promise<number | undefined> {
    return this.ethCache.get();
  }

  private headers(): Record<string, string> {
    const key = settings().coingeckoKey;
    return { accept: 'application/json', ...(key ? { 'x-cg-demo-api-key': key } : {}) };
  }

  private async get<T>(path: string, schema: z.ZodType<T>, retry = true): Promise<T> {
    const response = await this.send(`${COINGECKO_URL}${path}`, { headers: this.headers(), signal: AbortSignal.timeout(30_000) });

    // CoinGecko answers 429 when asked too often; waiting a little and asking once more usually works
    if (response.status === 429 && retry) {
      await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
      return this.get(path, schema, false);
    }
    if (!response.ok) throw new Error(`Market data answered ${response.status}`);
    return schema.parse(await response.json());
  }

  /// A list that changes once a day, kept in memory and on disk. If the feed fails, the old one is used however old it is.
  private async daily<T>(name: string, load: () => Promise<T>): Promise<T> {
    const kept = await readDisk<T>(name);
    if (kept && Date.now() - kept.at < DAY_MS) return kept.value;

    try {
      const value = await load();
      await writeDisk(name, value);
      return value;
    } catch (error) {
      if (kept) return kept.value;
      throw error;
    }
  }

  private baseAddresses() {
    return this.daily<Record<string, string>>('base-addresses', async () => {
      const response = await this.send(`${COINGECKO_URL}/coins/list?include_platform=true`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Market data answered ${response.status}`);

      const addresses: Record<string, string> = {};
      for (const { id, platforms } of (await response.json()) as { id: string; platforms?: Record<string, string> }[]) {
        if (platforms?.base) addresses[id] = platforms.base;
      }
      return addresses;
    });
  }

  private tokenIds(addresses: Record<string, string>) {
    return this.daily<string[]>('token-ids', async () => {
      const ids: string[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const batch = await this.get(`${MARKETS}&category=tokenized-stock&page=${page}`, marketsSchema);
        ids.push(...batch.map(({ id }) => id));
        if (batch.length < PAGE_SIZE) break;
      }
      return ids.filter((id) => addresses[id]);
    });
  }

  private async marketsOf(ids: string[]) {
    const chunks = Array.from({ length: Math.ceil(ids.length / IDS_PER_REQUEST) }, (_, i) =>
      ids.slice(i * IDS_PER_REQUEST, (i + 1) * IDS_PER_REQUEST),
    );
    const batches = await Promise.all(
      chunks.map((chunk) => this.get(`${MARKETS}&ids=${chunk.join(',')}&sparkline=true&price_change_percentage=1h,24h,7d`, marketsSchema)),
    );
    return batches.flat();
  }

  private async loadTokens(): Promise<BaseToken[]> {
    const addresses = await this.baseAddresses();
    const markets = await this.marketsOf(await this.tokenIds(addresses));

    return markets
      .filter((coin) => addresses[coin.id] && coin.current_price)
      .sort((a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0))
      .map((coin, i) => ({
        id: coin.id,
        ...describeToken(coin.name, coin.symbol),
        image: coin.image ?? undefined,
        address: addresses[coin.id] ?? '',
        price: coin.current_price ?? 0,
        marketCap: coin.market_cap ?? undefined,
        volume: coin.total_volume ?? undefined,
        rank: i + 1,
        change1h: toFraction(coin.price_change_percentage_1h_in_currency),
        change24h: toFraction(coin.price_change_percentage_24h_in_currency),
        change7d: toFraction(coin.price_change_percentage_7d_in_currency),
        series: (coin.sparkline_in_7d?.price ?? []).filter((_, index) => index % SERIES_STEP === SERIES_STEP - 1),
      }));
  }

  private async loadHistory(key: string): Promise<PricePoint[]> {
    const [window, tokenId = ''] = key.split('|') as [HistoryWindow, string];
    try {
      const path = `/coins/${encodeURIComponent(tokenId)}/market_chart?vs_currency=usd&days=${DAYS[window]}`;
      const response = await this.send(`${COINGECKO_URL}${path}`, { headers: this.headers(), signal: AbortSignal.timeout(15_000) });
      if (!response.ok) return [];

      return tokenHistorySchema
        .parse(await response.json())
        .prices.map(([ms, price]) => ({ time: Math.floor(ms / 1000), price }))
        .sort((a, b) => a.time - b.time);
    } catch {
      return [];
    }
  }

  private async loadEthPrice(): Promise<number | undefined> {
    const response = await this.send(`${COINGECKO_URL}/simple/price?ids=ethereum&vs_currencies=usd`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Market data answered ${response.status}`);
    return z.object({ ethereum: z.object({ usd: z.number() }) }).parse(await response.json()).ethereum.usd;
  }
}
