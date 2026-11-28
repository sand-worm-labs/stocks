import { TokenizedStocksService } from '@/infrastructure/datasource/coinbase/tokenized-stocks.service';

import { fakeFetch, json } from '../../../support/fake-fetch';

const token = (symbol: string, extra: object = {}) => ({ contract_address: `0xABC${symbol}`, symbol, name: `${symbol} Inc.`, decimals: 8, multiplier: 1, ...extra });

describe('the list of tokenized stocks on Base', () => {
  it('reads every stock on the list, with its contract in lowercase', async () => {
    const { send } = fakeFetch(() => json({ tokens: [token('PFEc', { isin: 'US7170811035', total_supply: 9.8 }), token('LLYc')] }));
    const listings = await new TokenizedStocksService(send).listings();

    expect(listings).toHaveLength(2);
    expect(listings[0]).toMatchObject({ source: 'coinbase', symbol: 'PFEc', address: '0xabcpfec', isin: 'US7170811035', totalSupply: 9.8, isPaused: false });
  });

  it('follows the pages until there are no more', async () => {
    const { send, calls } = fakeFetch((url) => (url.includes('page_token=two') ? json({ tokens: [token('B')] }) : json({ tokens: [token('A')], next_page_token: 'two' })));
    const listings = await new TokenizedStocksService(send).listings();

    expect(listings.map(({ symbol }) => symbol)).toEqual(['A', 'B']);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('page_size=500');
  });

  it('keeps one look at the list for everyone asking', async () => {
    const { send, calls } = fakeFetch(() => json({ tokens: [token('A')] }));
    const service = new TokenizedStocksService(send);
    await service.listings();
    await service.listings();
    expect(calls).toHaveLength(1);
  });

  it('gives nothing, not a made-up list, when Coinbase cannot be reached', async () => {
    const { send } = fakeFetch(() => json({}, 503));
    expect(await new TokenizedStocksService(send).listings()).toEqual([]);
  });
});
