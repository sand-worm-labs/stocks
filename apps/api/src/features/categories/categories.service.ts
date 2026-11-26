import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { CategoryRecord } from '@/features/market/types/market.types';

import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(private readonly dataSource: DataSource) {}

  /// Every category in the order it is shown, each with its stocks' tickers in theirs
  async list(): Promise<CategoryRecord[]> {
    const categories = await this.dataSource.manager.find(Category, {
      relations: { stocks: true },
      order: { position: 'ASC', stocks: { position: 'ASC' } },
    });
    return categories.map(({ id, label, isHot, isInterest, stocks }) => ({
      id,
      label,
      isHot,
      isInterest,
      tickers: stocks.map(({ ticker }) => ticker),
    }));
  }
}
