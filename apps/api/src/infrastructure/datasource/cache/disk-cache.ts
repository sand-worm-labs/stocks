import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { settings } from '@/config/settings';

// The two big CoinGecko lists change once a day and take half a minute to fetch, so they are kept on disk too: a restart then doesn't wait for them.
// Where they are kept can be set (MARKET_CACHE_DIR), which is what tests do so they never read a real cache.
const folder = () => settings().marketCacheDir ?? tmpdir();
const fileOf = (name: string) => join(folder(), `sandworm-stocks-${name}.json`);

export async function readDisk<T>(name: string): Promise<{ at: number; value: T } | undefined> {
  try {
    const [text, { mtimeMs }] = await Promise.all([readFile(fileOf(name), 'utf8'), stat(fileOf(name))]);
    return { at: mtimeMs, value: JSON.parse(text) as T };
  } catch {
    return undefined;
  }
}

export async function writeDisk(name: string, value: unknown) {
  await mkdir(folder(), { recursive: true });
  await writeFile(fileOf(name), JSON.stringify(value));
}
