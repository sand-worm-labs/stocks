const ISSUER = /\(([^)]*?)\s*Tokenized Stocks?\)/i;
const ISSUER_SUFFIX = /\b(aStock|ST0x|xStock|bStock)s?$/i;
const BY_NAME = /^(.*?)\s*\(/;

// Who issued a token, which company it follows and what to call it, from the name CoinGecko gives it. Coinbase's are written AAPLc.
export function describeToken(name: string, symbol: string) {
  const issuer = ISSUER.exec(name)?.[1] ?? ISSUER_SUFFIX.exec(name)?.[1] ?? 'Other';
  const company = BY_NAME.exec(name)?.[1] ?? name.replace(ISSUER_SUFFIX, '').trim();
  const display = issuer === 'Coinbase' ? `${symbol.slice(0, -1).toUpperCase()}c` : symbol.toUpperCase();

  return { issuer, company, symbol: display };
}
