import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ForPeople } from '@/core/decorators/for-people.decorator';
import { isBuyable } from './stock';
import { StrategyError } from '@/features/strategies/lifecycle/strategy-lifecycle';

import { StocksService } from './stocks.service';

// The stocks as the app and agents see them. (`/market` is the raw prices underneath, for the web app's server.)
@ApiTags('Markets')
@ForPeople()
@Controller('markets')
export class MarketsController {
  constructor(private readonly stocks: StocksService) {}

  // Without each one's price history, a chart's worth of numbers that is for a page to draw
  @Get('stocks')
  async list() {
    const stocks = await this.stocks.source.getStocks();
    return stocks.map(({ series: _series, ...stock }) => ({ ...stock, isBuyable: isBuyable(stock) }));
  }

  // One stock in full. Only one that can be bought has a page.
  @Get('stocks/:symbol')
  async one(@Param('symbol') symbol: string) {
    const found = await this.stocks.source.getStockDetail(symbol);
    if (!found) throw new StrategyError("That stock isn't on offer, or has no token to buy yet", 404);
    return found;
  }

  @Get('summary')
  async summary() {
    const [summary, categories] = await Promise.all([this.stocks.source.getMarketSummary(), this.stocks.source.getCategories()]);
    return { summary, categories };
  }
}
