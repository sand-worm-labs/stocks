import { Module } from '@nestjs/common';

import { CategoriesModule } from '@/features/categories/categories.module';

import { CoinGeckoService } from '@/infrastructure/datasource/coingecko/coingecko.service';
import { DexScreenerService } from '@/infrastructure/datasource/dexscreener/dexscreener.service';
import { MARKET_FETCH } from '@/infrastructure/datasource/datasource.constants';
import { MarketController } from './market.controller';
import { MarketsController } from './markets.controller';
import { StocksService } from './stocks.service';
import { YahooService } from '@/infrastructure/datasource/yahoo/yahoo.service';

@Module({
  imports: [CategoriesModule],
  controllers: [MarketController, MarketsController],
  providers: [{ provide: MARKET_FETCH, useValue: fetch }, YahooService, CoinGeckoService, DexScreenerService, StocksService],
  exports: [YahooService, StocksService],
})
export class MarketModule {}
