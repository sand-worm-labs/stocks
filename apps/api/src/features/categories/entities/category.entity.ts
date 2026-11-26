import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';

import { CategoryStock } from './category-stock.entity';

// A group of stocks, such as robotics. `isHot` puts it among the markets page's first chips; `isInterest` offers it on the first run.
@Entity('categories')
export class Category {
  @PrimaryColumn('text') id: string;
  @Column('text') label: string;
  @Column('integer', { default: 0 }) position: number;
  @Column('boolean', { name: 'is_hot', default: false }) isHot: boolean;
  @Column('boolean', { name: 'is_interest', default: false }) isInterest: boolean;
  @OneToMany(() => CategoryStock, (stock) => stock.category) stocks: CategoryStock[];
}
