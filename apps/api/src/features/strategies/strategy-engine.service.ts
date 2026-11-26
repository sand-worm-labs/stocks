import { ConflictException, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';

import { reportMockData } from '@/_mockdata/reports';
import { StocksService } from '@/features/market/stocks.service';
import { YahooService } from '@/infrastructure/datasource/yahoo/yahoo.service';
import { createLocalPipeline } from '@/features/strategies/design/local-pipeline';
import { ResearchFailure } from '@/features/research/research-failure';
import type { GetDailyPrices } from '@/features/research/prices';
import { getProducer } from '@/features/research/producer.factory';
import { completeRecord } from '@/features/strategies/lifecycle/complete-record';
import { StoreConflict } from '@/features/strategies/lifecycle/store-conflict';
import { createStrategyService, ProduceContext, StrategyService } from '@/features/strategies/lifecycle/strategy-lifecycle';
import type { StrategyRecord, StrategyStore } from '@/features/strategies/types/strategy-record';

import { StrategiesService } from './strategies.service';
import type { StrategyRecord as KeptRecord } from '@/features/strategies/types/kept-record';

const DEFAULT_YEARS = 3;

// The database as the strategy steps know it
function storeOver(strategies: StrategiesService): StrategyStore {
  // The two types describe one JSON document: the database's side leaves the parts it never looks into untyped
  const read = (kept: KeptRecord) => completeRecord(kept as unknown as StrategyRecord);

  return {
    async list(ownerId) {
      const kept = await strategies.list(ownerId);
      return kept.map(read);
    },
    async get(id) {
      const kept = await strategies.get(id);
      return kept && read(kept);
    },
    async save(record) {
      try {
        return await strategies.save(record as unknown as KeptRecord);
      } catch (error) {
        if (error instanceof ConflictException) throw new StoreConflict();
        throw error;
      }
    },
  };
}

// Real daily prices for research. When Yahoo's side says why a stock can't be tested, that is what the person is told, since it is about
// their stock.
function pricesFrom(yahoo: YahooService): GetDailyPrices {
  return async (tickers, years = DEFAULT_YEARS) => {
    try {
      return await yahoo.dailyPrices(tickers, years);
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw new ResearchFailure(error.message);
      throw new ResearchFailure('The prices could not be reached. Try again in a moment');
    }
  };
}

// The steps a strategy goes through, joined to the database, the market and whoever does the research
@Injectable()
export class StrategyEngine {
  private readonly logger = new Logger(StrategyEngine.name);
  readonly store: StrategyStore;
  readonly steps: StrategyService;

  constructor(strategies: StrategiesService, stocks: StocksService, yahoo: YahooService) {
    this.store = storeOver(strategies);
    this.steps = createStrategyService({
      store: this.store,
      // The local stand-in until Sandworm's agent designs strategies too
      pipeline: createLocalPipeline(reportMockData[1]!),
      producer: getProducer({ market: () => stocks.source.getStocks(), getPrices: pricesFrom(yahoo) }),
      prices: () => stocks.prices(),
      market: () => stocks.market(),
    });
  }

  /// Starts a waiting run's work and returns at once: it takes minutes, and what goes wrong is kept on the run for the person to see
  startResearch(ownerId: string, id: string, context: ProduceContext) {
    this.steps.produce(ownerId, id, context).catch((error: unknown) => this.logger.error(error));
  }
}
