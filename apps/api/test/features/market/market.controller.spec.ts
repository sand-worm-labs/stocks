import { BadRequestException } from '@nestjs/common';

import { MarketController } from '@/features/market/market.controller';

const yahoo = { quotes: jest.fn(), history: jest.fn(), chartSymbol: jest.fn(), dailyPrices: jest.fn() };
const coingecko = { tokens: jest.fn(), tokenHistory: jest.fn(), ethPrice: jest.fn() };
const dexscreener = { quotes: jest.fn() };

const controller = () =>
  new MarketController(yahoo as never, coingecko as never, dexscreener as never, {} as never);

describe('the market endpoints', () => {
  beforeEach(() => jest.resetAllMocks());

  it('reads a comma list, trimmed, with the empty ones dropped', () => {
    controller().quotes(' AAPL, NVDA ,,');
    expect(yahoo.quotes).toHaveBeenCalledWith(['AAPL', 'NVDA']);
  });

  it('refuses a window that is not day, week or month', () => {
    expect(() => controller().fundHistory('SPY', 'year')).toThrow(BadRequestException);
    expect(() => controller().tokenHistory('x', 'hour')).toThrow(BadRequestException);
  });

  it('passes a good window on, and asks for a day when none is given', () => {
    controller().fundHistory('SPY', 'week');
    controller().fundHistory('SPY');
    expect(yahoo.history).toHaveBeenNthCalledWith(1, 'SPY', 'week');
    expect(yahoo.history).toHaveBeenNthCalledWith(2, 'SPY', 'day');
  });

  it('limits how many tickers and tokens one call may ask about', () => {
    expect(() => controller().quotes(Array.from({ length: 61 }, (_, i) => `T${i}`).join(','))).toThrow(BadRequestException);
    expect(() => controller().pools(Array.from({ length: 201 }, (_, i) => `0x${i}`).join(','))).toThrow(BadRequestException);
  });

  it('checks the tickers and years of daily prices', () => {
    expect(() => controller().dailyPrices(undefined)).toThrow(BadRequestException);
    expect(() => controller().dailyPrices('AAPL', '0')).toThrow(BadRequestException);
    expect(() => controller().dailyPrices('AAPL', '11')).toThrow(BadRequestException);
    expect(() => controller().dailyPrices('AAPL', 'x')).toThrow(BadRequestException);

    controller().dailyPrices('AAPL,NVDA');
    expect(yahoo.dailyPrices).toHaveBeenCalledWith(['AAPL', 'NVDA'], 3);
  });

  it('wraps a symbol and a price in an object, so a missing one is plain', async () => {
    yahoo.chartSymbol.mockResolvedValue('NASDAQ:META');
    coingecko.ethPrice.mockResolvedValue(undefined);
    expect(await controller().chartSymbol('META')).toEqual({ symbol: 'NASDAQ:META' });
    expect(await controller().ethPrice()).toEqual({ usd: undefined });
  });
});
