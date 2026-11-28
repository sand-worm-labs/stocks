import { profileFrom } from '@/features/market/profiles/company-profile';

const hit = (symbol: string, name: string, extra: object = {}) => ({ symbol, name, isEquity: true, ...extra });

describe('what company a ticker is', () => {
  it('has the sector and industry of the company with that ticker and name', () => {
    const profile = profileFrom('PFE', 'Pfizer Inc', [hit('PFE', 'Pfizer Inc.', { sector: 'Healthcare', industry: 'Drug Manufacturers—General' })]);
    expect(profile).toEqual({ isListed: true, sector: 'Healthcare', industry: 'Drug Manufacturers—General' });
  });

  it('is not the company that merely shares the ticker', () => {
    expect(profileFrom('ANT', 'Anthropic, PBC', [hit('ANT', 'Antero Resources Corp', { sector: 'Energy' })])).toEqual({ isListed: false });
  });

  it('is not listed when nothing is found, and unknown when Yahoo could not be asked', () => {
    expect(profileFrom('SPCX', 'Space Exploration Technologies', [])).toEqual({ isListed: false });
    expect(profileFrom('SPCX', 'Space Exploration Technologies', undefined)).toBeUndefined();
  });

  it('is the company renamed after its ticker, and the listing found under another ticker by name', () => {
    expect(profileFrom('GE', 'General Electric Company', [hit('GE', 'GE Aerospace', { sector: 'Industrials' })])?.sector).toBe('Industrials');
    expect(profileFrom('VSXY', "Victoria's Secret & Co.", [hit('VSCO', "Victoria's Secret & Co.", { sector: 'Consumer Cyclical' })], true)?.sector).toBe('Consumer Cyclical');
    expect(profileFrom('VSXY', "Victoria's Secret & Co.", [hit('VSCO', "Victoria's Secret & Co.", { sector: 'Consumer Cyclical' })])).toEqual({ isListed: false });
  });

  it('reads a dotted ticker as Yahoo writes it, and ignores what is not a share', () => {
    expect(profileFrom('BRK.B', 'Berkshire Hathaway Inc.', [hit('BRK-B', 'Berkshire Hathaway Inc.', { sector: 'Financial Services' })])?.sector).toBe('Financial Services');
    expect(profileFrom('PFE', 'Pfizer Inc', [hit('PFE', 'Pfizer Inc.', { isEquity: false })])).toEqual({ isListed: false });
  });
});
