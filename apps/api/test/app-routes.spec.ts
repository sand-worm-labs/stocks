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

  const call = (method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'OPTIONS', path: string, options: { body?: object | string; session?: string; headers?: Record<string, string> } = {}) =>
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
      expect((await call('GET', `/strategies/${id}/brief`, { session: mine })).json()).toHaveProperty('report.kpis');

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
