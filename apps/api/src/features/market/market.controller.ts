import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CoinGeckoService } from '@/infrastructure/datasource/coingecko/coingecko.service';
import { DexScreenerService } from '@/infrastructure/datasource/dexscreener/dexscreener.service';
import { StocksService } from './stocks.service';
import { HistoryWindow } from '@/infrastructure/datasource/datasource.types';
import { YahooService } from '@/infrastructure/datasource/yahoo/yahoo.service';

const WINDOWS: HistoryWindow[] = ['day', 'week', 'month'];
const MOST_TICKERS = 60;
const MOST_ADDRESSES = 200;
const MOST_YEARS = 10;

const listOf = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function windowOf(value: string): HistoryWindow {
  if (!WINDOWS.includes(value as HistoryWindow)) throw new BadRequestException('window is day, week or month');
  return value as HistoryWindow;
}

// What the web app used to ask Yahoo, CoinGecko and DexScreener for itself. It is asked here now, once, and kept for a while, so every page and the
// realtime server share one answer and one set of rate limits.
@ApiTags('Market')
@Controller('market')
export class MarketController {
  constructor(
    private readonly yahoo: YahooService,
    private readonly coingecko: CoinGeckoService,
    private readonly dexscreener: DexScreenerService,
    private readonly stocks: StocksService,
  ) {}

  // The categories stocks are grouped into, against the stocks on offer
  @Get('categories')
  categories() {
    return this.stocks.source.getCategories();
  }

  @Get('tokens')
  tokens() {
    return this.coingecko.tokens();
  }

  @Get('tokens/:id/history')
  tokenHistory(@Param('id') id: string, @Query('window') window = 'day') {
    return this.coingecko.tokenHistory(id, windowOf(window));
  }

  @Get('eth-price')
  async ethPrice() {
    return { usd: await this.coingecko.ethPrice() };
  }

  @Get('pools')
  pools(@Query('addresses') addresses?: string) {
    const list = listOf(addresses);
    if (list.length > MOST_ADDRESSES) throw new BadRequestException(`Ask for ${MOST_ADDRESSES} tokens or fewer`);
    return this.dexscreener.quotes(list);
  }

  @Get('quotes')
  quotes(@Query('tickers') tickers?: string) {
    const list = listOf(tickers);
    if (list.length > MOST_TICKERS) throw new BadRequestException(`Ask for ${MOST_TICKERS} tickers or fewer`);
    return this.yahoo.quotes(list);
  }

  @Get('funds/:ticker/history')
  fundHistory(@Param('ticker') ticker: string, @Query('window') window = 'day') {
    return this.yahoo.history(ticker, windowOf(window));
  }

  @Get('chart-symbol/:ticker')
  async chartSymbol(@Param('ticker') ticker: string) {
    return { symbol: await this.yahoo.chartSymbol(ticker) };
  }

  @Get('daily-prices')
  dailyPrices(@Query('tickers') tickers?: string, @Query('years') years = '3') {
    const list = listOf(tickers);
    const count = Number(years);
    if (!list.length || list.length > MOST_TICKERS) throw new BadRequestException(`Ask for 1 to ${MOST_TICKERS} tickers`);
    if (!Number.isInteger(count) || count < 1 || count > MOST_YEARS) throw new BadRequestException(`years is 1 to ${MOST_YEARS}`);
    return this.yahoo.dailyPrices(list, count);
  }
}
