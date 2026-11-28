import { Module } from '@nestjs/common';

import { CategoriesModule } from '@/features/categories/categories.module';

import { CoinGeckoService } from '@/infrastructure/datasource/coingecko/coingecko.service';
import { DexScreenerService } from '@/infrastructure/datasource/dexscreener/dexscreener.service';
import { MARKET_FETCH } from '@/infrastructure/datasource/datasource.constants';
import { MarketController } from './market.controller';
import { MarketsController } from './markets.controller';
import { StocksService } from './stocks.service';
import { TokenizedStocksService } from '@/infrastructure/datasource/coinbase/tokenized-stocks.service';
import { StockProfilesService } from './profiles/stock-profiles.service';
import { UniverseService } from './universe/universe.service';
import { LISTING_SOURCES } from './universe/universe.types';
import { YahooService } from '@/infrastructure/datasource/yahoo/yahoo.service';

@Module({
  imports: [CategoriesModule],
  controllers: [MarketController, MarketsController],
  providers: [
    { provide: MARKET_FETCH, useValue: fetch },
    YahooService,
    CoinGeckoService,
    DexScreenerService,
    TokenizedStocksService,
    // Where stocks are found. Another issuer or chain is one more source here; nothing that reads the universe changes.
    { provide: LISTING_SOURCES, useFactory: (coinbase: TokenizedStocksService) => [coinbase], inject: [TokenizedStocksService] },
    StockProfilesService,
    UniverseService,
    StocksService,
  ],
  exports: [YahooService, StocksService, UniverseService],
})
export class MarketModule {}
