import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '../src');

const sources = (folder: string): string[] =>
  readdirSync(folder).flatMap((name) => {
    const full = join(folder, name);
    if (statSync(full).isDirectory()) return sources(full);
    return name.endsWith('.ts') ? [full] : [];
  });

// Class names, dark mode variants and React belong to the web app
const SCREEN_ONLY = /CLASSNAME|className|\bdark:[a-z]|\b(text|bg)-(ink|emerald|red|amber)-|from ["']react/;

describe('the API', () => {
  it('holds nothing about how a screen looks', () => {
    const screens = sources(SRC)
      .filter((file) => SCREEN_ONLY.test(readFileSync(file, 'utf8')))
      .map((file) => relative(SRC, file));
    expect(screens).toEqual([]);
  });
});
