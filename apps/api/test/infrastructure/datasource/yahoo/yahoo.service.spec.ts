import { UnprocessableEntityException } from '@nestjs/common';

import { YahooService } from '@/infrastructure/datasource/yahoo/yahoo.service';

import { chart, fakeFetch, json } from '../../../support/fake-fetch';

const days = (count: number) => Array.from({ length: count }, (_, i) => 100 + i * 0.5);

describe('Yahoo prices', () => {
  it('gives a share its price, name, how it moved and its closes', async () => {
    const { send } = fakeFetch(() => chart([100, 105, 110, 120], { price: 121, name: 'Apple Inc.' }));
    const quotes = await new YahooService(send).quotes(['AAPL']);

    expect(quotes.AAPL).toMatchObject({ price: 121, name: 'Apple Inc.', series: [100, 105, 110, 120] });
    expect(quotes.AAPL?.monthChange).toBeCloseTo(0.21);
    expect(quotes.AAPL?.dayChange).toBeCloseTo(121 / 110 - 1);
  });

  it('leaves out a ticker Yahoo does not know, and one that answers nonsense', async () => {
    const { send } = fakeFetch((url) => (url.includes('/AAPL?') ? chart([100, 101], { price: 101 }) : url.includes('/BAD?') ? json({ nonsense: true }) : undefined));
    const quotes = await new YahooService(send).quotes(['AAPL', 'MISSING', 'BAD']);
    expect(Object.keys(quotes)).toEqual(['AAPL']);
  });

  it('asks once for a ticker however often it is asked about', async () => {
    const { send, calls } = fakeFetch(() => chart([1, 2]));
    const yahoo = new YahooService(send);
    await yahoo.quotes(['AAPL', 'AAPL']);
    await yahoo.quotes(['AAPL']);
    expect(calls).toHaveLength(1);
  });

  it('names the exchange a share is listed on, so a chart finds the right one', async () => {
    const { send } = fakeFetch((url) => chart([1, 2], { exchange: url.includes('NYSE') ? 'NYQ' : 'NMS' }));
    const yahoo = new YahooService(send);
    expect(await yahoo.chartSymbol('META')).toBe('NASDAQ:META');
  });

  it('gives the bare ticker when the exchange is not known or Yahoo fails', async () => {
    expect(await new YahooService(fakeFetch(() => chart([1], { exchange: 'XYZ' })).send).chartSymbol('ABC')).toBe('ABC');
    expect(await new YahooService(fakeFetch(() => new Response('no', { status: 500 })).send).chartSymbol('DEF')).toBe('DEF');
  });

  it('asks for a finer step the shorter the stretch', async () => {
    const { send, calls } = fakeFetch(() => chart([1, 2]));
    const yahoo = new YahooService(send);
    await yahoo.history('SPY', 'day');
    await yahoo.history('SPY', 'week');
    await yahoo.history('SPY', 'month');
    expect(calls[0]).toContain('range=1d&interval=5m');
    expect(calls[1]).toContain('range=5d&interval=15m');
    expect(calls[2]).toContain('range=1mo&interval=1h');
  });

  it('gives a history as times and prices, without the moments Yahoo has no price for', async () => {
    const { send } = fakeFetch(() => chart([10, null, 12], { start: 1000 }));
    expect(await new YahooService(send).history('SPY', 'day')).toEqual([
      { time: 1000, price: 10 },
      { time: 1000 + 2 * 86_400, price: 12 },
    ]);
  });

  it('gives no history when Yahoo fails', async () => {
    expect(await new YahooService(fakeFetch(() => new Response('', { status: 500 })).send).history('SPY', 'day')).toEqual([]);
  });
});

describe('daily prices for a test', () => {
  const answerWith = (closesFor: (ticker: string) => (number | null)[]) =>
    fakeFetch((url) => chart(closesFor(/chart\/([^?]+)\?/.exec(url)?.[1] ?? '')));

  it('gives the stocks and the S&P 500 over the same days', async () => {
    const { send } = answerWith(() => days(260));
    const prices = await new YahooService(send).dailyPrices(['AAPL', 'NVDA'], 3);

    expect(Object.keys(prices.closes).sort()).toEqual(['AAPL', 'NVDA', 'SPY']);
    expect(prices.dates).toHaveLength(260);
    expect(prices.closes.SPY).toHaveLength(260);
  });

  it('leaves out a day any of them has no price for, from all of them', async () => {
    const { send } = answerWith((ticker) => {
      const closes: (number | null)[] = days(260);
      if (ticker === 'AAPL') closes[10] = null;
      return closes;
    });
    const prices = await new YahooService(send).dailyPrices(['AAPL'], 3);
    expect(prices.dates).toHaveLength(259);
    expect(prices.closes.SPY).toHaveLength(259);
  });

  it('refuses a stock with too little history, and says which', async () => {
    const { send } = answerWith((ticker) => (ticker === 'NEW' ? days(50) : days(260)));
    await expect(new YahooService(send).dailyPrices(['NEW'], 3)).rejects.toThrow(/NEW has too little price history to test \(50 days\)/);
  });

  it('refuses a stock Yahoo has no history for', async () => {
    const { send } = fakeFetch((url) => (url.includes('/GONE?') ? new Response('', { status: 404 }) : chart(days(260))));
    await expect(new YahooService(send).dailyPrices(['GONE'], 3)).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(new YahooService(send).dailyPrices(['GONE'], 3)).rejects.toThrow(/No price history for GONE \(Yahoo answered 404\)/);
  });

  it('refuses when the stocks have too few days in common', async () => {
    // Both have enough days of their own, but one starts 100 days after the other, so only 160 are shared
    const { send } = fakeFetch((url) => chart(days(260), { start: url.includes('/AAPL?') ? 1_700_000_000 + 100 * 86_400 : 1_700_000_000 }));
    await expect(new YahooService(send).dailyPrices(['AAPL'], 3)).rejects.toThrow(/too few days of prices in common/);
  });
});
