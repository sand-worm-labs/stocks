import { describeToken } from '@/infrastructure/datasource/coingecko/describe-token';

describe('who a tokenized stock is from', () => {
  it('writes a Coinbase stock with a c, from its issuer in the name', () => {
    expect(describeToken('Apple (Coinbase Tokenized Stock)', 'aaplx')).toEqual({ issuer: 'Coinbase', company: 'Apple', symbol: 'AAPLc' });
  });

  it('keeps another issuer\'s symbol, and finds the issuer from the suffix of the name', () => {
    expect(describeToken('Tesla aStock', 'tsla')).toEqual({ issuer: 'aStock', company: 'Tesla', symbol: 'TSLA' });
    expect(describeToken('NVIDIA (Dinari Tokenized Stock)', 'nvda.d')).toMatchObject({ issuer: 'Dinari', symbol: 'NVDA.D' });
  });

  it('calls an unknown issuer Other', () => {
    expect(describeToken('Some Token', 'sto')).toEqual({ issuer: 'Other', company: 'Some Token', symbol: 'STO' });
  });
});
