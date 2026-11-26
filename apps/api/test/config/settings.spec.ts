import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { checkSettings, settings } from '@/config/settings';

import { stubEnv, unstubAllEnvs } from '../support/env';

afterEach(unstubAllEnvs);

const SRC = join(__dirname, '../../src');

const sources = (folder: string): string[] =>
  readdirSync(folder).flatMap((name) => {
    const full = join(folder, name);
    if (statSync(full).isDirectory()) return sources(full);
    return name.endsWith('.ts') ? [full] : [];
  });

describe('settings', () => {
  it('are the only thing that reads the environment', () => {
    const others = sources(SRC)
      .filter((file) => readFileSync(file, 'utf8').includes('process.env'))
      .map((file) => relative(SRC, file));
    expect(others).toEqual(['config/settings.ts']);
  });

  it('treats a setting left empty as not set', () => {
    stubEnv('RESEARCH_PRODUCER', '');
    stubEnv('SANDWORM_API_URL', '');
    expect(settings().researchProducer).toBe('standin');
  });

  it('has Sandworm do the research when there is a Sandworm to ask', () => {
    stubEnv('RESEARCH_PRODUCER', '');
    stubEnv('SANDWORM_API_URL', 'https://sandworm.test/api/');
    expect(settings().researchProducer).toBe('sandworm');
    expect(settings().sandworm.apiUrl).toBe('https://sandworm.test/api');
  });

  it('refuses a research producer that is misspelt, instead of falling back to the stand-in', () => {
    stubEnv('RESEARCH_PRODUCER', 'agnet');
    expect(() => settings()).toThrow(/RESEARCH_PRODUCER/);
  });

  it("won't start a producer that needs Sandworm without it", () => {
    stubEnv('DATABASE_URL', 'postgresql://x');
    stubEnv('STOCKS_API_KEY', 'key');
    stubEnv('AUTH_SECRET', 'a-secret-that-is-long-enough-for-the-tests');
    stubEnv('SANDWORM_API_URL', '');
    stubEnv('RESEARCH_PRODUCER', 'sandworm');
    expect(checkSettings).toThrow(/needs SANDWORM_API_URL/);
  });

  it('refuses a secret too short to sign with', () => {
    stubEnv('AUTH_SECRET', 'short');
    expect(() => settings()).toThrow(/AUTH_SECRET/);
  });
});
