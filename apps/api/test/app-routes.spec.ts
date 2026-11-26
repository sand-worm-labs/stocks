import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { createHash } from 'node:crypto';

import { stubEnv, unstubAllEnvs } from './support/env';
import { ownDatabase } from './support/own-database';

const ME = '11111111-1111-4111-8111-111111111111';
const THEM = '22222222-2222-4222-8222-222222222222';
const SITE = { host: 'localhost:4000', 'x-forwarded-host': 'stocks.test', origin: 'http://stocks.test' };
const IDEA = 'Grow 500 USDC with robotics over 3+ years. Max 20% in any one stock.';

// The routes the browser and agents call, on the real app with a real database; only the market's providers are made to be down.
// Set TEST_DATABASE_URL to run it.
const url = process.env.TEST_DATABASE_URL;
(url ? describe : describe.skip)('the routes people and agents call', () => {
  let app: NestFastifyApplication;
  let tokens: typeof import('@/features/auth/core/token');
  let mine: string;
  let theirs: string;

  const call = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS', path: string, options: { body?: object | string; session?: string; headers?: Record<string, string> } = {}) =>
    app.inject({
      method,
      url: path,
      headers: { ...SITE, ...options.headers },
      cookies: options.session ? { sw_session: options.session } : {},
      payload: options.body,
    });

  beforeAll(async () => {
    stubEnv('DATABASE_URL', await ownDatabase(url!, 'stocks_http_test'));
    stubEnv('STOCKS_API_KEY', 'service-key');
    stubEnv('AUTH_SECRET', 'a-secret-that-is-long-enough-for-the-tests');
    stubEnv('AUTH_REQUIRED', 'true');
    stubEnv('RESEARCH_PRODUCER', 'standin');
    stubEnv('SANDWORM_API_URL', '');
    stubEnv('NODE_ENV', 'production');
    stubEnv('LOG_LEVEL', 'silent');

    // Read after the environment is set, as the database's settings are taken when its module is loaded
    const { AppModule } = await import('../src/app.module');
    const { createAdapter, setUp } = await import('@/core/setup');
    const { MARKET_FETCH } = await import('@/infrastructure/datasource/datasource.constants');
    tokens = await import('@/features/auth/core/token');

    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MARKET_FETCH)
      .useValue(async () => new Response('down', { status: 503 }))
      .compile();
    app = module.createNestApplication<NestFastifyApplication>(createAdapter(), { logger: false });
    await setUp(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    mine = await tokens.signSession(ME);
    theirs = await tokens.signSession(THEM);
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    unstubAllEnvs();
  });

  const create = async () => {
    const response = await call('POST', '/strategies', { session: mine, body: { brief: IDEA } });
    return response.json<{ id: string }>().id;
  };

  describe('who is asking', () => {
    it('refuses someone not signed in', async () => {
      const response = await call('GET', '/strategies');
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'Sign in first' });
    });

    it('refuses a change that came from another site, even with the cookie', async () => {
      const response = await call('POST', '/strategies', { session: mine, body: { brief: IDEA }, headers: { origin: 'http://elsewhere.test' } });
      expect(response.statusCode).toBe(403);
    });

    it("answers an agent with the person's token, with no origin to check", async () => {
      const token = await tokens.signFor('agent', ME, 60);
      const response = await app.inject({ method: 'GET', url: '/strategies', headers: { authorization: `Bearer ${token}` } });
      expect(response.statusCode).toBe(200);
    });

    it("doesn't take a session for an agent's token", async () => {
      const response = await call('GET', '/strategies', { headers: { authorization: `Bearer ${mine}` } });
      expect(response.statusCode).toBe(401);
    });

    it("doesn't let an agent allow an agent", async () => {
      const token = await tokens.signFor('agent', ME, 60);
      const body = { client_id: 'x', redirect_uri: 'https://x.test', code_challenge: 'x', allow: true };
      const response = await call('POST', '/oauth/approve', { body, headers: { authorization: `Bearer ${token}` } });
      expect(response.statusCode).toBe(403);
    });

    it("keeps the stored records for the web app's server only", async () => {
      expect((await call('GET', `/internal/strategies?ownerId=${ME}`, { session: mine })).statusCode).toBe(401);
      const response = await call('GET', `/internal/strategies?ownerId=${ME}`, { headers: { authorization: 'Bearer service-key' } });
      expect(response.statusCode).toBe(200);
    });
  });

  describe('a strategy from idea to trading', () => {
    it('is made, confirmed, researched, traded on paper, and changed', async () => {
      const id = await create();

      const listed = await call('GET', '/strategies', { session: mine });
      expect(listed.json()).toEqual(expect.arrayContaining([expect.objectContaining({ id, stage: 'rules' })]));
      expect((await call('GET', `/strategies/${id}/rules`, { session: mine })).statusCode).toBe(200);
      const brief = (await call('GET', `/strategies/${id}/brief`, { session: mine })).json();
      expect(brief).toHaveProperty('report.kpis');
      // The parts of the report, which the one notebook is laid out as: an agent is told them, numbered
      expect(brief.report.outline.map((part: { title: string }) => part.title)).toEqual(expect.arrayContaining(['1 · The answer', '3 · Growth of 1 USDC', '9 · Sources and method']));
      expect(brief.report.outline).toHaveLength(9);
      expect(brief.report.instructions).toMatch(/One notebook for this strategy, and only one/);

      const renamed = await call('PATCH', `/strategies/${id}`, { session: mine, body: { name: 'Robots' } });
      expect(renamed.json()).toEqual({ name: 'Robots' });

      const confirmed = await call('POST', `/strategies/${id}/confirm`, { session: mine });
      expect(confirmed.statusCode).toBe(200);
      expect(confirmed.json()).toEqual({ stage: 'researching' });

      const researching = await call('GET', '/strategies/research', { session: mine });
      expect(researching.json().strategies).toEqual(expect.arrayContaining([{ id, name: 'Robots', stage: 'researching' }]));

      const ready = await call('POST', `/strategies/${id}/ready`, { session: mine });
      expect(ready.json().stage).toBe('ready');

      const traded = await call('POST', `/strategies/${id}/trade`, { session: mine, body: { mode: 'paper', amount: 100 } });
      expect(traded.json()).toEqual({ id });

      const added = await call('POST', `/strategies/${id}/funds`, { session: mine, body: { direction: 'add', amount: 50 } });
      expect(added.statusCode).toBe(200);
      const sold = await call('POST', `/strategies/${id}/sell`, { session: mine, body: { share: 1 } });
      expect(sold.json().received).toBeGreaterThan(0);

      const activity = await call('GET', `/strategies/${id}/activity`, { session: mine });
      expect(activity.json().length).toBeGreaterThan(3);
      expect((await call('GET', '/activity', { session: mine })).statusCode).toBe(200);
    });

    it('says at once, to a person or an agent, when what the idea names is not on Base', async () => {
      const oil = 'Grow 1,000 USDC in oil stocks (Exxon, Chevron, Shell and similar). Ask before buying.';
      const made = await call('POST', '/strategies', { session: mine, body: { brief: oil } });
      const { id, coverage } = made.json<{ id: string; coverage: { basis: string; couldntMatch: string[]; tests: unknown[]; headline: string } }>();
      expect(coverage).toMatchObject({ basis: 'fallback', couldntMatch: expect.arrayContaining(['oil', 'Exxon']) });
      expect(coverage.headline).toMatch(/^Nothing on Base matches/);
      expect(coverage.tests.length).toBeGreaterThan(0);

      // The same words wherever the strategy is read, so a page and an agent can't tell the person different things
      expect((await call('GET', `/strategies/${id}/rules`, { session: mine })).json().coverage).toEqual(coverage);
      expect((await call('GET', `/strategies/${id}/brief`, { session: mine })).json().coverage).toEqual(coverage);
      const idea = await call('POST', '/strategies', { session: mine, body: { brief: IDEA } });
      expect(idea.json().coverage.basis).toBe('named');
    });

    it('is handed back by an agent that did the research', async () => {
      stubEnv('RESEARCH_PRODUCER', 'standin');
      const id = await create();
      const token = await tokens.signFor('agent', ME, 60);
      const agent = { authorization: `Bearer ${token}` };
      await call('POST', `/strategies/${id}/confirm`, { headers: agent });

      const refused = await call('POST', `/strategies/${id}/research`, { headers: agent, body: { result: { nothing: true } } });
      expect(refused.statusCode).toBe(422);
      expect(refused.json().error).toMatch(/research result/);
    });

    it("is not found by anyone else", async () => {
      const id = await create();
      const response = await call('GET', `/strategies/${id}`, { session: theirs });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toEqual({ error: "That strategy wasn't found" });
    });

    it('takes a button with nothing to send even when the client says its body is JSON (what a browser sends)', async () => {
      const id = await create();
      const json = { 'content-type': 'application/json' };
      const confirmed = await call('POST', `/strategies/${id}/confirm`, { session: mine, headers: json });
      expect(confirmed.statusCode).toBe(200);
      expect((await call('POST', `/strategies/${id}/ready`, { session: mine, headers: json })).statusCode).toBe(200);
      // A body that says it is JSON and isn't is still refused, in words
      const broken = await call('POST', '/strategies', { session: mine, headers: json, body: '{not json' });
      expect(broken.statusCode).toBe(400);
    });

    it('says what is wrong with a request', async () => {
      const response = await call('POST', '/strategies', { session: mine, body: {} });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toMatch(/missing something/);
    });

    it('has no report to share before research', async () => {
      const id = await create();
      const response = await call('POST', `/strategies/${id}/share`, { session: mine });
      expect(response.statusCode).toBe(409);
    });
  });

  describe('managing a strategy: renaming, closing, the trash, and deleting for good', () => {
    const trading = async () => {
      const id = await create();
      await call('POST', `/strategies/${id}/confirm`, { session: mine });
      await call('POST', `/strategies/${id}/ready`, { session: mine });
      await call('POST', `/strategies/${id}/trade`, { session: mine, body: { mode: 'paper', amount: 200 } });
      return id;
    };
    const nameOf = async (id: string) => (await call('GET', `/strategies/${id}`, { session: mine })).json<{ name: string }>().name;
    const ids = async (path: string) => (await call('GET', path, { session: mine })).json<{ id: string }[]>().map(({ id }) => id);

    it('renames a strategy at any stage, even when it is trading', async () => {
      const id = await trading();
      expect((await call('PATCH', `/strategies/${id}`, { session: mine, body: { name: 'Steady big tech' } })).json()).toEqual({ name: 'Steady big tech' });
      expect(await nameOf(id)).toBe('Steady big tech');
      expect((await call('PATCH', `/strategies/${id}`, { session: mine, body: { name: '   ' } })).statusCode).toBe(400);
    });

    it('refuses to delete a strategy that holds money, and says to close it first', async () => {
      const id = await trading();
      const refused = await call('DELETE', `/strategies/${id}`, { session: mine });
      expect(refused.statusCode).toBe(409);
      expect(refused.json().error).toMatch(/still trading: it holds \d+ stocks? and .* USDC in cash\. Close it first/);
      expect(await ids('/strategies')).toContain(id);
    });

    it('closes a trading strategy, selling everything and taking the cash out, and keeps it to read', async () => {
      const id = await trading();
      const closed = await call('POST', `/strategies/${id}/close`, { session: mine });
      expect(closed.statusCode).toBe(200);
      expect(closed.json()).toMatchObject({ status: 'closed', takenOut: expect.any(Number) });
      expect(closed.json().takenOut).toBeGreaterThan(0);

      const report = (await call('GET', `/strategies/${id}`, { session: mine })).json();
      expect(report).toMatchObject({ status: 'closed', holdings: [], cash: 0 });
      expect(ids('/strategies')).resolves.toContain(id);
      expect((await call('GET', `/strategies/${id}/activity`, { session: mine })).json<{ kind: string }[]>().map(({ kind }) => kind)).toContain('closed');

      // Nothing more can be put into or taken out of it
      expect((await call('POST', `/strategies/${id}/funds`, { session: mine, body: { direction: 'add', amount: 10 } })).statusCode).toBe(409);
      expect((await call('POST', `/strategies/${id}/close`, { session: mine })).statusCode).toBe(409);
    });

    it('puts a deleted strategy in the trash, with its chat, and puts it back as it was', async () => {
      const id = await trading();
      await call('POST', `/strategies/${id}/close`, { session: mine });
      await call('POST', `/strategies/${id}/agent/messages`, { session: mine, body: { text: 'How did it do?' } });

      const removed = await call('DELETE', `/strategies/${id}`, { session: mine });
      expect(removed.statusCode).toBe(200);
      expect(await ids('/strategies')).not.toContain(id);
      const trash = (await call('GET', '/strategies/trash', { session: mine })).json<{ id: string; purgesAt: string }[]>();
      expect(trash.map(({ id: each }) => each)).toContain(id);
      expect(Date.parse(trash.find(({ id: each }) => each === id)!.purgesAt)).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);

      // While it is there nothing works on it, and the web app's server can't read it (so a shared link to its report stops working)
      expect((await call('GET', `/strategies/${id}`, { session: mine })).statusCode).toBe(404);
      expect((await call('GET', `/strategies/${id}/agent`, { session: mine })).statusCode).toBe(404);
      expect((await call('GET', `/internal/strategies/${id}`, { headers: { authorization: 'Bearer service-key' } })).statusCode).toBe(404);

      expect((await call('POST', `/strategies/${id}/restore`, { session: mine })).statusCode).toBe(200);
      expect(await ids('/strategies')).toContain(id);
      const thread = (await call('GET', `/strategies/${id}/agent`, { session: mine })).json<{ messages: unknown[] }>();
      expect(thread.messages.length).toBeGreaterThan(3);
    });

    it("keeps one person's trash from another's", async () => {
      const id = await create();
      await call('DELETE', `/strategies/${id}`, { session: mine });
      expect((await call('GET', '/strategies/trash', { session: theirs })).json()).toEqual([]);
      expect((await call('POST', `/strategies/${id}/restore`, { session: theirs })).statusCode).toBe(404);
      expect((await call('DELETE', `/strategies/${id}`, { session: theirs })).statusCode).toBe(404);
    });

    it('deletes for good only from the trash, only with the right name, and takes everything that belongs to it', async () => {
      const id = await create();
      const name = await nameOf(id);

      // Not in the trash yet
      expect((await call('POST', `/strategies/${id}/purge`, { session: mine, body: { confirmName: name } })).statusCode).toBe(404);
      await call('DELETE', `/strategies/${id}`, { session: mine });

      const wrong = await call('POST', `/strategies/${id}/purge`, { session: mine, body: { confirmName: 'not it' } });
      expect(wrong.statusCode).toBe(400);
      expect(wrong.json().error).toMatch(/Type the strategy's name/);
      expect((await call('POST', `/strategies/${id}/purge`, { session: theirs, body: { confirmName: name } })).statusCode).toBe(404);

      expect((await call('POST', `/strategies/${id}/purge`, { session: mine, body: { confirmName: name } })).statusCode).toBe(200);
      expect((await call('GET', '/strategies/trash', { session: mine })).json<{ id: string }[]>().map(({ id: each }) => each)).not.toContain(id);
      expect((await call('POST', `/strategies/${id}/restore`, { session: mine })).statusCode).toBe(404);
      // Its activity went with it: nothing is left in the person's list to open
      const activity = (await call('GET', '/activity', { session: mine })).json<{ portfolioId?: string }[]>();
      expect(activity.some(({ portfolioId }) => portfolioId === id)).toBe(false);
    });
  });

  describe('the conversation with the agent about a strategy', () => {
    type Block = { type: string; status?: string; text?: string };
    type Message = { id: string; from: 'user' | 'agent'; blocks: Block[] };
    type Thread = { messages: Message[]; suggestions: string[] };

    const trading = async () => {
      const id = await create();
      await call('POST', `/strategies/${id}/confirm`, { session: mine });
      await call('POST', `/strategies/${id}/ready`, { session: mine });
      await call('POST', `/strategies/${id}/trade`, { session: mine, body: { mode: 'paper', amount: 200 } });
      return id;
    };
    const open = async (id: string, session = mine) => (await call('GET', `/strategies/${id}/agent`, { session })).json<Thread>();
    const say = (id: string, text: string, session = mine) => call('POST', `/strategies/${id}/agent/messages`, { session, body: { text } });
    const decide = (id: string, messageId: string, decision: 'confirm' | 'cancel', session = mine) =>
      call('POST', `/strategies/${id}/agent/messages/${messageId}`, { session, body: { decision } });
    const proposalOf = (message: Message) => message.blocks.find((block) => block.type === 'proposal');
    const ledgerLength = async (id: string) => (await call('GET', `/strategies/${id}/activity`, { session: mine })).json<unknown[]>().length;

    it("starts with the strategy's own story, and keeps what is said, so it is the same when opened again", async () => {
      const id = await trading();
      const first = await open(id);
      expect(first.messages.map(({ from }) => from)).toEqual(['user', 'agent']);
      expect(first.messages[0]!.blocks[0]).toMatchObject({ type: 'text', text: IDEA });
      expect(first.messages[1]!.blocks[0]!.text).toMatch(/^Started on paper: bought/);

      const answered = await say(id, 'How is it doing?');
      expect(answered.statusCode).toBe(200);
      expect(answered.json<{ messages: Message[] }>().messages.map(({ from }) => from)).toEqual(['user', 'agent']);

      const again = await open(id);
      expect(again.messages).toHaveLength(4);
      expect(again.messages.slice(0, 2)).toEqual(first.messages);
      expect(again.messages[3]!.blocks[0]!.text).toMatch(/is worth .* USDC now/);
    });

    it('is kept for the strategy, whoever opens it where', async () => {
      const id = await trading();
      await say(id, 'What are my rules?');
      const sameAgain = await open(id);
      const onAnotherDevice = await open(id, await tokens.signSession(ME));
      expect(onAnotherDevice.messages).toEqual(sameAgain.messages);
    });

    it("is not read or added to by anyone but the strategy's owner", async () => {
      const id = await trading();
      await say(id, 'How is it doing?');
      expect((await call('GET', `/strategies/${id}/agent`, { session: theirs })).statusCode).toBe(404);
      expect((await say(id, 'sell everything', theirs)).statusCode).toBe(404);
      expect((await call('GET', `/strategies/${id}/agent`)).statusCode).toBe(401);
      expect((await call('POST', `/strategies/${id}/agent/messages`, { session: mine, body: { text: 'hi' }, headers: { origin: 'http://elsewhere.test' } })).statusCode).toBe(403);
    });

    it('refuses an empty message and one that is too long', async () => {
      const id = await trading();
      expect((await say(id, '   ')).statusCode).toBe(400);
      expect((await say(id, 'x'.repeat(1001))).statusCode).toBe(400);
    });

    it('puts what happened to the strategy in once, however often it is opened', async () => {
      const id = await trading();
      await Promise.all([open(id), open(id), open(id)]);
      expect((await open(id)).messages).toHaveLength(2);
    });

    it('moves no money until a step it proposed is confirmed, and then moves it once, however many times it is confirmed', async () => {
      const id = await trading();
      const before = await ledgerLength(id);

      const proposed = (await say(id, 'Add 50 USDC')).json<{ messages: Message[] }>().messages[1]!;
      expect(proposalOf(proposed)).toMatchObject({ status: 'pending', title: 'Add 50.00 USDC' });
      expect(await ledgerLength(id)).toBe(before);

      const confirms = await Promise.all([decide(id, proposed.id, 'confirm'), decide(id, proposed.id, 'confirm')]);
      expect(confirms.map(({ statusCode }) => statusCode)).toEqual([200, 200]);
      const replies = confirms.flatMap((response) => response.json<{ messages: Message[] }>().messages.filter(({ id: each }) => each !== proposed.id));
      expect(replies).toHaveLength(1);
      expect(replies[0]!.blocks[0]!.text).toMatch(/^Added 50.00 USDC/);

      const after = await ledgerLength(id);
      expect(after).toBeGreaterThan(before);
      await decide(id, proposed.id, 'confirm');
      expect(await ledgerLength(id)).toBe(after);
      expect(proposalOf((await open(id)).messages.find(({ id: each }) => each === proposed.id)!)).toMatchObject({ status: 'done' });
    });

    it('does nothing for a step that is cancelled, and cannot then be confirmed', async () => {
      const id = await trading();
      const before = await ledgerLength(id);
      const proposed = (await say(id, 'sell everything')).json<{ messages: Message[] }>().messages[1]!;

      const cancelled = await decide(id, proposed.id, 'cancel');
      expect(proposalOf(cancelled.json<{ messages: Message[] }>().messages[0]!)).toMatchObject({ status: 'cancelled' });
      await decide(id, proposed.id, 'confirm');
      expect(await ledgerLength(id)).toBe(before);
    });

    it('has one step waiting at a time: a new proposal takes the older one off the table', async () => {
      const id = await trading();
      const older = (await say(id, 'Add 50 USDC')).json<{ messages: Message[] }>().messages[1]!;
      const newer = await say(id, 'sell half of everything');
      expect(newer.json<{ superseded: string[] }>().superseded).toEqual([older.id]);

      const thread = await open(id);
      expect(proposalOf(thread.messages.find(({ id: each }) => each === older.id)!)).toMatchObject({ status: 'cancelled' });
    });

    it("lets nobody else confirm a person's step", async () => {
      const id = await trading();
      const proposed = (await say(id, 'sell everything')).json<{ messages: Message[] }>().messages[1]!;
      expect((await decide(id, proposed.id, 'confirm', theirs)).statusCode).toBe(404);
    });

    it('says what is wrong when a confirmed step cannot be done, instead of failing', async () => {
      const id = await trading();
      const proposed = (await say(id, 'sell everything')).json<{ messages: Message[] }>().messages[1]!;
      await call('POST', `/strategies/${id}/sell`, { session: mine, body: { share: 1 } });

      const confirmed = await decide(id, proposed.id, 'confirm');
      expect(confirmed.statusCode).toBe(200);
      const [updated, said] = confirmed.json<{ messages: Message[] }>().messages;
      expect(proposalOf(updated!)).toMatchObject({ status: 'failed' });
      expect(said!.blocks[0]).toMatchObject({ type: 'note', text: expect.stringMatching(/./) });
    });

    it('answers a strategy that is not trading yet without proposing anything', async () => {
      const id = await create();
      const answered = (await say(id, 'sell everything')).json<{ messages: Message[] }>().messages[1]!;
      expect(proposalOf(answered)).toBeUndefined();
      expect((await open(id)).messages.map(({ from }) => from)).toEqual(['user', 'agent']);
    });
  });

  describe("the web app's server", () => {
    it('is not counted by the rate limit, while others are', async () => {
      const server = await call('GET', '/market/pools', { headers: { authorization: 'Bearer service-key' } });
      expect(server.headers['x-ratelimit-limit']).toBeUndefined();
      expect((await call('GET', '/markets/summary', { session: mine })).headers['x-ratelimit-limit']).toBe('600');
    });
  });

  describe('markets and chat', () => {
    it('lists the stocks even when the price providers are down', async () => {
      const stocks = (await call('GET', '/markets/stocks', { session: mine })).json<{ symbol: string; isBuyable: boolean; series?: unknown }[]>();
      expect(stocks.length).toBeGreaterThan(0);
      expect(stocks[0]).not.toHaveProperty('series');

      const buyable = stocks.find((stock) => stock.isBuyable)!;
      expect((await call('GET', `/markets/stocks/${buyable.symbol}`, { session: mine })).statusCode).toBe(200);
      expect((await call('GET', '/markets/stocks/NOPE', { session: mine })).statusCode).toBe(404);
      expect((await call('GET', '/markets/summary', { session: mine })).json()).toHaveProperty('categories');
    });

    it('gives a chat pass for the person asking', async () => {
      const { ticket } = (await call('GET', '/chat/ticket', { session: mine })).json<{ ticket: string }>();
      expect(await tokens.readChatTicket(ticket)).toBe(ME);
    });
  });

  describe('signing in and out', () => {
    it('only from the app', async () => {
      const response = await call('POST', '/auth/session', { body: { token: 'x' }, headers: { origin: 'http://elsewhere.test' } });
      expect(response.statusCode).toBe(403);
    });

    it('forgets the cookies on the way out', async () => {
      const response = await call('POST', '/auth/logout', { session: mine });
      expect(response.statusCode).toBe(200);
      expect(response.cookies.map(({ name, value }) => [name, value])).toEqual([
        ['sw_session', ''],
        ['sw_sandworm', ''],
      ]);
    });
  });

  describe("an agent's sign-in", () => {
    it('registers, is allowed by the person, and swaps the code for a token that works', async () => {
      const redirect = 'http://localhost:9999/callback';
      const verifier = 'v'.repeat(64);
      const challenge = createHash('sha256').update(verifier).digest('base64url');
      const anywhere = { origin: 'http://elsewhere.test' };

      const registered = await call('POST', '/oauth/register', { body: { redirect_uris: [redirect], client_name: 'Claude' }, headers: anywhere });
      expect(registered.statusCode).toBe(201);
      expect(registered.headers['access-control-allow-origin']).toBe('*');
      const { client_id } = registered.json<{ client_id: string }>();

      const approved = await call('POST', '/oauth/approve', { session: mine, body: { client_id, redirect_uri: redirect, code_challenge: challenge, allow: true } });
      const code = new URL(approved.json<{ redirect: string }>().redirect).searchParams.get('code')!;

      const form = new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verifier, client_id, redirect_uri: redirect });
      const swapped = await call('POST', '/oauth/token', { body: form.toString(), headers: { ...anywhere, 'content-type': 'application/x-www-form-urlencoded' } });
      expect(swapped.statusCode).toBe(200);

      const { access_token } = swapped.json<{ access_token: string }>();
      const whoami = await call('GET', '/oauth/whoami', { headers: { authorization: `Bearer ${access_token}` } });
      expect(whoami.json()).toEqual({ ok: true });
    });

    it('says no the way the standard does', async () => {
      const response = await call('POST', '/oauth/token', { body: { grant_type: 'password' } });
      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('unsupported_grant_type');
    });

    it('answers the browser that asks first whether it may', async () => {
      const response = await call('OPTIONS', '/oauth/token');
      expect(response.statusCode).toBe(204);
    });
  });
});
