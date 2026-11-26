import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { Category } from './category.entity';

// One stock in a category, by its share's ticker (AAPL), whether or not it has a token to buy
@Entity('category_stocks')
export class CategoryStock {
  @PrimaryColumn('text', { name: 'category_id' }) categoryId: string;
  @PrimaryColumn('text') ticker: string;
  @Column('integer', { default: 0 }) position: number;

  @ManyToOne(() => Category, (category) => category.stocks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
