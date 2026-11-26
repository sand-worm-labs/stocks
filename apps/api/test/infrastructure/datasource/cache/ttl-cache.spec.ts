import { KeyedCache, RememberedCache, TtlCache } from '@/infrastructure/datasource/cache/ttl-cache';

describe('a value kept for a while', () => {
  let time = 1_000;
  const now = () => time;
  beforeEach(() => {
    time = 1_000;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('is worked out once while it is fresh', async () => {
    const load = jest.fn().mockResolvedValue('a');
    const cache = new TtlCache(100, load, 60_000, now);

    expect(await cache.get()).toBe('a');
    time += 99;
    expect(await cache.get()).toBe('a');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('gives everyone who asks at the same moment the one answer', async () => {
    const load = jest.fn().mockResolvedValue('a');
    const cache = new TtlCache(100, load, 60_000, now);

    expect(await Promise.all([cache.get(), cache.get(), cache.get()])).toEqual(['a', 'a', 'a']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('gives the old value straight away once it is stale, and has a new one by the next ask', async () => {
    const load = jest.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('new');
    const cache = new TtlCache(100, load, 60_000, now);
    await cache.get();

    time += 101;
    expect(await cache.get()).toBe('old');
    await Promise.resolve();
    await Promise.resolve();
    expect(await cache.get()).toBe('new');
  });

  it('keeps the last good value when the feed fails, and leaves the feed alone for a while', async () => {
    const load = jest.fn().mockResolvedValueOnce('good').mockRejectedValue(new Error('down'));
    const cache = new TtlCache(100, load, 60_000, now);
    await cache.get();

    time += 101;
    await cache.get(); // starts the refresh that fails
    await new Promise((resolve) => setImmediate(resolve));
    expect(await cache.get()).toBe('good');

    const calls = load.mock.calls.length;
    time += 1_000;
    await cache.get();
    expect(load).toHaveBeenCalledTimes(calls);

    time += 60_000;
    await cache.get();
    expect(load.mock.calls.length).toBeGreaterThan(calls);
  });

  it('has nothing to give when the first try fails, and does not hammer the feed after', async () => {
    const load = jest.fn().mockRejectedValue(new Error('down'));
    const cache = new TtlCache<string>(100, load, 60_000, now);

    expect(await cache.get()).toBeUndefined();
    expect(await cache.get()).toBeUndefined();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps each key of a keyed cache apart', async () => {
    const load = jest.fn(async (key: string) => key.toUpperCase());
    const cache = new KeyedCache(100, load, now);

    expect(await cache.get('a')).toBe('A');
    expect(await cache.get('b')).toBe('B');
    expect(await cache.get('a')).toBe('A');
    expect(load).toHaveBeenCalledTimes(2);
  });
});

describe('a value kept that says why it failed', () => {
  it('keeps what worked, and throws what did not, without keeping the failure', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('too little history')).mockResolvedValue('ok');
    const cache = new RememberedCache(100, load);

    await expect(cache.get('a')).rejects.toThrow('too little history');
    expect(await cache.get('a')).toBe('ok');
    expect(await cache.get('a')).toBe('ok');
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('gives everyone asking at once the same one answer', async () => {
    const load = jest.fn().mockResolvedValue('ok');
    const cache = new RememberedCache(100, load);
    await Promise.all([cache.get('a'), cache.get('a')]);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
