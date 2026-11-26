import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

// The one description of the database, used by the app and by the typeorm command line. The tables are only ever changed by a migration:
// `synchronize` stays off, and the migrations run when the app starts, so the code cannot run ahead of the tables.
export const dataSourceOptions: PostgresConnectionOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [join(__dirname, '../../features/**/*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations/*.{ts,js}')],
  migrationsRun: true,
  synchronize: false,
};

export default new DataSource(dataSourceOptions);
