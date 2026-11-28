export const YAHOO_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';
export const YAHOO_SEARCH_URL = 'https://query2.finance.yahoo.com/v1/finance/search';
export const COINBASE_STOCKS_URL = 'https://api.coinbase.com/v1/tokenized-stocks';
export const COINGECKO_URL = 'https://api.coingecko.com/api/v3';
export const DEXSCREENER_URL = 'https://api.dexscreener.com/tokens/v1/base';

/// What the services call the outside with, so a test can stand in for the internet
export const MARKET_FETCH = Symbol('MARKET_FETCH');
