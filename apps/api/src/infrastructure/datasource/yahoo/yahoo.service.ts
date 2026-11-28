import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';

import { YAHOO_URL, YAHOO_SEARCH_URL, MARKET_FETCH } from '@/infrastructure/datasource/datasource.constants';
import { DailyPrices, HistoryWindow, PricePoint, Quote, SearchHit } from '@/infrastructure/datasource/datasource.types';
import { KeyedCache, RememberedCache } from '@/infrastructure/datasource/cache/ttl-cache';

const HEADERS = { 'User-Agent': 'Mozilla/5.0' };
const MINUTES = 60_000;
const DAY_MS = 24 * 60 * MINUTES;

// A bare ticker like META is a different thing on other exchanges, and the chart takes the first it finds. Knowing the exchange that lists the
// share makes it NASDAQ:META.
const EXCHANGES: Record<string, string> = {
  NMS: 'NASDAQ',
  NGM: 'NASDAQ',
  NCM: 'NASDAQ',
  NYQ: 'NYSE',
  ASE: 'AMEX',
  PCX: 'NYSE ARCA',
  BTS: 'CBOE',
};

// Prices come in finer steps the shorter the stretch
const WINDOWS = { day: ['1d', '5m'], week: ['5d', '15m'], month: ['1mo', '1h'] } as const;

const MIN_DAYS = 200;
export const BENCHMARK = 'SPY';

const searchSchema = z.object({
  quotes: z
    .array(
      z.object({
        symbol: z.string(),
        quoteType: z.string().optional(),
        longname: z.string().optional(),
        shortname: z.string().optional(),
        exchDisp: z.string().optional(),
        sector: z.string().optional(),
        industry: z.string().optional(),
      }),
    )
    .default([]),
});

const nullableCloses = z.array(z.number().nullable());
const quoteSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          meta: z.object({ regularMarketPrice: z.number(), longName: z.string().optional() }),
          indicators: z.object({ quote: z.array(z.object({ close: nullableCloses })) }),
        }),
      )
      .nonempty(),
  }),
});
const exchangeSchema = z.object({
  chart: z.object({ result: z.array(z.object({ meta: z.object({ exchangeName: z.string() }) })).nonempty() }),
});
const seriesSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z.object({
          timestamp: z.array(z.number()).optional(),
          indicators: z.object({ quote: z.array(z.object({ close: nullableCloses })) }),
        }),
      )
      .nonempty(),
  }),
});

@Injectable()
export class YahooService {
  private readonly quoteCache = new KeyedCache<Quote | undefined>(5 * MINUTES, (ticker) => this.loadQuote(ticker));
  private readonly symbolCache = new KeyedCache<string>(DAY_MS, (ticker) => this.loadChartSymbol(ticker));
  private readonly historyCache = new KeyedCache<PricePoint[]>(5 * MINUTES, (key) => this.loadHistory(key));
  private readonly closesCache = new RememberedCache<Map<string, number>>(60 * MINUTES, (key) => this.loadCloses(key));

  constructor(@Inject(MARKET_FETCH) private readonly send: typeof fetch) {}

  /// A share's price and its month, for each ticker Yahoo knows; one it does not know is left out
  async quotes(tickers: string[]): Promise<Record<string, Quote>> {
    const unique = [...new Set(tickers)];
    const found = await Promise.all(unique.map((ticker) => this.quoteCache.get(ticker)));
    return Object.fromEntries(unique.flatMap((ticker, i) => (found[i] ? [[ticker, found[i]]] : [])));
  }

  /// What Yahoo's search finds for a ticker or a company's name, with each company's sector and industry. Undefined when Yahoo could not be asked, which is not the
  /// same as asking and finding nothing (an empty list).
  async search(query: string): Promise<SearchHit[] | undefined> {
    try {
      const url = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(query)}&quotesCount=6&newsCount=0`;
      const response = await this.send(url, { headers: HEADERS, signal: AbortSignal.timeout(8_000) });
      if (!response.ok) return undefined;

      const { quotes } = searchSchema.parse(await response.json());
      return quotes.map((quote) => ({
        symbol: quote.symbol,
        name: quote.longname ?? quote.shortname ?? quote.symbol,
        isEquity: quote.quoteType === 'EQUITY',
        exchange: quote.exchDisp,
        sector: quote.sector,
        industry: quote.industry,
      }));
    } catch {
      return undefined;
    }
  }

  async chartSymbol(ticker: string): Promise<string> {
    return (await this.symbolCache.get(ticker)) ?? ticker;
  }

  async history(ticker: string, window: HistoryWindow): Promise<PricePoint[]> {
    return (await this.historyCache.get(`${window}|${ticker}`)) ?? [];
  }

  /// Real daily prices for the stocks and the S&P 500 (as SPY) over the same days. A day any of them has no price for is left out of all, so
  /// every line in a test is looked at on the same days.
  async dailyPrices(tickers: string[], years: number): Promise<DailyPrices> {
    const wanted = [...new Set([...tickers, BENCHMARK])];
    const series = await Promise.all(wanted.map((ticker) => this.dailyCloses(ticker, years)));

    const dates = [...(series[0]?.keys() ?? [])].filter((date) => series.every((one) => one.has(date))).sort();
    if (dates.length < MIN_DAYS) throw new UnprocessableEntityException('The stocks have too few days of prices in common to test');

    const closes = Object.fromEntries(
      wanted.map((ticker, i) => [ticker, dates.map((date) => Math.round((series[i]?.get(date) ?? 0) * 100) / 100)]),
    );
    return { dates, closes };
  }

  private dailyCloses(ticker: string, years: number) {
    return this.closesCache.get(`${years}|${ticker}`);
  }

  private async fetchChart(ticker: string, range: string, interval: string, timeoutMs: number) {
    return this.send(`${YAHOO_URL}/${encodeURIComponent(ticker)}?range=${range}&interval=${interval}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

  private async loadQuote(ticker: string): Promise<Quote | undefined> {
    try {
      const response = await this.fetchChart(ticker, '1mo', '1d', 5_000);
      if (!response.ok) return undefined;

      const [{ meta, indicators }] = quoteSchema.parse(await response.json()).chart.result;
      const closes = indicators.quote[0]?.close.filter((close): close is number => close !== null) ?? [];
      const price = meta.regularMarketPrice;
      const yesterday = closes.at(-2);

      return {
        price,
        name: meta.longName,
        monthChange: closes[0] ? price / closes[0] - 1 : undefined,
        dayChange: yesterday ? price / yesterday - 1 : undefined,
        series: closes,
      };
    } catch {
      return undefined;
    }
  }

  private async loadChartSymbol(ticker: string): Promise<string> {
    try {
      const response = await this.fetchChart(ticker.replace('.', '-'), '1d', '1d', 5_000);
      if (!response.ok) return ticker;

      const [{ meta }] = exchangeSchema.parse(await response.json()).chart.result;
      const exchange = EXCHANGES[meta.exchangeName];
      return exchange ? `${exchange}:${ticker}` : ticker;
    } catch {
      return ticker;
    }
  }

  private async loadHistory(key: string): Promise<PricePoint[]> {
    const [window, ticker = ''] = key.split('|') as [HistoryWindow, string];
    try {
      const [range, interval] = WINDOWS[window];
      const response = await this.fetchChart(ticker, range, interval, 15_000);
      if (!response.ok) return [];

      const [{ timestamp = [], indicators }] = seriesSchema.parse(await response.json()).chart.result;
      const closes = indicators.quote[0]?.close ?? [];
      return timestamp.flatMap((time, i) => {
        const close = closes[i];
        return close == null ? [] : [{ time, price: close }];
      });
    } catch {
      return [];
    }
  }

  private async loadCloses(key: string): Promise<Map<string, number>> {
    const [years, ticker = ''] = key.split('|');
    const response = await this.fetchChart(ticker, `${years}y`, '1d', 20_000);
    if (!response.ok) throw new UnprocessableEntityException(`No price history for ${ticker} (Yahoo answered ${response.status})`);

    const [result] = seriesSchema.parse(await response.json()).chart.result;
    const closes = result?.indicators.quote[0]?.close ?? [];
    const byDate = new Map<string, number>();
    result?.timestamp?.forEach((time, i) => {
      const close = closes[i];
      if (close != null && close > 0) byDate.set(new Date(time * 1000).toISOString().slice(0, 10), close);
    });
    if (byDate.size < MIN_DAYS) throw new UnprocessableEntityException(`${ticker} has too little price history to test (${byDate.size} days)`);
    return byDate;
  }
}
