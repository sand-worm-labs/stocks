// A value that is worked out once and kept for a while. Whoever asks while it is being worked out waits for that one answer, and when working
// it out fails, the last good value is kept rather than nothing. The market feeds answer slowly and refuse often, and the same few things are
// asked for by every page.
export class TtlCache<T> {
  private value: { at: number; data: T } | undefined;
  private loading: Promise<T> | undefined;
  private retryAt = 0;

  constructor(
    private readonly keptMs: number,
    private readonly load: () => Promise<T>,
    // How long to leave a feed alone after it has failed
    private readonly retryAfterMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  /// What there is now: fresh if it is, otherwise stale straight away while a new one is fetched, and only the first time ever is it waited for
  async get(): Promise<T | undefined> {
    const fresh = this.value && this.now() - this.value.at < this.keptMs;
    if (fresh) return this.value?.data;

    if (this.value) {
      if (this.now() >= this.retryAt) void this.refresh();
      return this.value.data;
    }

    if (this.now() < this.retryAt) return undefined;
    return this.refresh();
  }

  private refresh(): Promise<T | undefined> {
    this.loading ??= this.load()
      .then((data) => {
        this.value = { at: this.now(), data };
        return data;
      })
      .catch((error: unknown) => {
        console.error('A market feed failed:', error);
        this.retryAt = this.now() + this.retryAfterMs;
        return this.value?.data as T;
      })
      .finally(() => {
        this.loading = undefined;
      });
    return this.loading;
  }
}

// Many values of one kind, each kept on its own: a share's quote, a token's history
export class KeyedCache<T> {
  private readonly entries = new Map<string, TtlCache<T>>();

  constructor(
    private readonly keptMs: number,
    private readonly load: (key: string) => Promise<T>,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string): Promise<T | undefined> {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = new TtlCache(this.keptMs, () => this.load(key), 60_000, this.now);
      this.entries.set(key, entry);
    }
    return entry.get();
  }
}

// Like KeyedCache, but a failure is not hidden: it is thrown to whoever asked, and is not kept, so the next ask tries again. For answers whose
// reason for failing is itself something to tell the person (a stock that has too little history to test).
export class RememberedCache<T> {
  private readonly values = new Map<string, { at: number; data: T }>();
  private readonly loading = new Map<string, Promise<T>>();

  constructor(
    private readonly keptMs: number,
    private readonly load: (key: string) => Promise<T>,
    private readonly now: () => number = Date.now,
  ) {}

  async get(key: string): Promise<T> {
    const kept = this.values.get(key);
    if (kept && this.now() - kept.at < this.keptMs) return kept.data;

    let pending = this.loading.get(key);
    if (!pending) {
      pending = this.load(key)
        .then((data) => {
          this.values.set(key, { at: this.now(), data });
          return data;
        })
        .finally(() => this.loading.delete(key));
      this.loading.set(key, pending);
    }
    return pending;
  }
}
