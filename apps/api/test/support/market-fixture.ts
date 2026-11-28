import { json } from './fake-fetch';

// A small made-up market for tests that boot the whole app: what Coinbase lists, and which of those have a pool on Base. Everything else the
// market's providers are asked for is down.
type Token = { symbol: string; name: string; pool?: number; price?: number };

export const TOKENS: Token[] = [
  { symbol: 'NVDAc', name: 'NVIDIA Corporation', pool: 2_000_000, price: 150 },
  { symbol: 'AMZNc', name: 'Amazon.com, Inc.', pool: 650_000, price: 244 },
  { symbol: 'GOOGLc', name: 'Alphabet Inc.', pool: 1_700_000, price: 273 },
  { symbol: 'TSLAc', name: 'Tesla, Inc.', pool: 200_000, price: 380 },
  { symbol: 'AAPLc', name: 'Apple Inc.', pool: 570_000, price: 355 },
  { symbol: 'MSFTc', name: 'Microsoft Corporation', pool: 465_000, price: 450 },
  { symbol: 'LLYc', name: 'Eli Lilly & Co', pool: 224_000, price: 800 },
  // Listed with no pool, so not yet to be bought
  { symbol: 'ISRGc', name: 'Intuitive Surgical, Inc.' },
  { symbol: 'XOMc', name: 'ExxonMobil Holdings Corporation' },
  { symbol: 'PFEc', name: 'Pfizer Inc' },
];

export const addressOf = (symbol: string) => `0x${Buffer.from(symbol).toString('hex').padEnd(40, '0')}`;

const listing = ({ symbol, name }: Token) => ({ contract_address: addressOf(symbol), symbol, name, decimals: 8, multiplier: 1, total_supply: 10, description: `About ${name}\n\n${name} is a company.` });

const pair = ({ symbol, pool, price }: Token) => ({
  pairAddress: `0xpair${symbol}`,
  baseToken: { address: addressOf(symbol) },
  quoteToken: { address: '0xusdc' },
  priceUsd: String(price),
  priceChange: { h24: 1.5 },
  liquidity: { usd: pool },
});

export function marketFetch(tokens: Token[] = TOKENS) {
  return async (input: string | URL | Request) => {
    const url = String(input);
    if (url.includes('api.coinbase.com')) return json({ tokens: tokens.map(listing) });
    if (url.includes('api.dexscreener.com')) {
      const asked = url.split('/').pop()?.split(',').map((address) => address.toLowerCase()) ?? [];
      return json(tokens.filter((token) => token.pool && asked.includes(addressOf(token.symbol).toLowerCase())).map(pair));
    }
    return new Response('down', { status: 503 });
  };
}
