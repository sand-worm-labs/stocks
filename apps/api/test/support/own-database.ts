import { DataSource } from 'typeorm';

// A database of its own beside the test one, made if it isn't there: test files run side by side, and one emptying the tables would empty
// them under another
export async function ownDatabase(url: string, name: string) {
  const server = await new DataSource({ type: 'postgres', url }).initialize();
  const found: unknown[] = await server.query('select 1 from pg_database where datname = $1', [name]);
  if (!found.length) await server.query(`create database ${name}`);
  await server.destroy();

  const own = new URL(url);
  own.pathname = `/${name}`;
  return own.toString();
}
