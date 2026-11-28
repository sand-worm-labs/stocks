import { Injectable } from '@nestjs/common';

import { CategoriesService } from '@/features/categories/categories.service';

import { createStockSource, StockSource } from './stock-source';
import { UniverseService } from './universe/universe.service';


// The stocks the product offers, each with its share's price on top
@Injectable()
export class StocksService {
  readonly source: StockSource;

  constructor(universe: UniverseService, categories: CategoriesService) {
    this.source = createStockSource(
      () => universe.stocks(),
      () => categories.list(),
    );
  }

  /// Today's price of each stock on offer, by symbol
  async prices(): Promise<Record<string, number>> {
    const stocks = await this.source.getStocks();
    return Object.fromEntries(stocks.flatMap(({ symbol, price }) => (price ? [[symbol, price]] : [])));
  }

  /// What the agent looks at when it designs and researches a strategy
  async market() {
    const [stocks, categories] = await Promise.all([this.source.getStocks(), this.source.getCategories()]);
    return { stocks, categories };
  }
}
