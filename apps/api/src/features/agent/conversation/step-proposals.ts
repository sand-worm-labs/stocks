import { formatPercent } from '@/common/utils/format';
import type { Fact, Reply } from '@/features/agent/types/agent-message.types';
import { PAPER_DEPOSIT_MAX } from '@/features/strategies/trading/trade.constants';
import { splitDeposit } from '@/features/strategies/trading/deposit';
import { depositLines, LedgerError, saleLines } from '@/features/strategies/trading/ledger';
import { toPortfolio } from '@/features/strategies/lifecycle/to-portfolio';
import type { Context } from './context';
import { link, links, note, offer, reply, say } from './replies';
import { capOf, priceOf, type Position, standingOf, usdc } from './strategy-facts';

const CHANGE_RULES = 'Change rules';

const NOTHING_MOVES = 'Nothing moves until you confirm.';

// A step the agent asks the person to confirm, with what it would do spelled out, and the button that does it
function propose(intro: string, title: string, rows: Fact[], step: NonNullable<Reply['proposal']>['step']): Reply {
  return { blocks: [say(`${intro} ${NOTHING_MOVES}`)], proposal: { step, title, rows, confirmLabel: title } };
}

// Today's price, or what was paid when there is none, so a stock that has dropped out of the feed can still be priced to sell
function pricer({ record, stocks }: Context) {
  const quote = priceOf(stocks);
  const paid = new Map(standingOf(record, stocks).positions.map(({ symbol, cost, units }) => [symbol, cost / units]));
  return (symbol: string) => quote(symbol) ?? paid.get(symbol);
}

export function addFundsReply(context: Context, amount: number | undefined): Reply {
  if (!amount) {
    return reply(say('How much would you like to add?'), offer('Add 50 USDC', 'Add 100 USDC', 'Add 250 USDC'));
  }
  if (amount > PAPER_DEPOSIT_MAX) return reply(say(`The most I can add at once is ${usdc(PAPER_DEPOSIT_MAX)} while it trades on paper.`));

  const { record, stocks, now } = context;
  const standing = standingOf(record, stocks);
  const valued = {
    ...toPortfolio(record),
    cash: standing.cash,
    holdings: standing.positions.map(({ symbol, units, cost, value }) => ({ symbol, units, cost, value, entryPrice: cost / units })),
  };
  const { buys } = splitDeposit(valued, amount, capOf(record) ?? 1);
  const lines = depositLines(record, amount, buys, pricer(context), now.toISOString());

  const bought = lines.filter(({ kind }) => kind === 'buy');
  const fees = bought.reduce((sum, { fee = 0 }) => sum + fee, 0);
  const staysInCash = amount + bought.reduce((sum, { usdc: spent }) => sum + spent, 0);

  const rows: Fact[] = bought.map(({ symbol, usdc: spent, fee = 0 }) => ({
    label: standing.positions.find((position) => position.symbol === symbol)?.name ?? symbol ?? '',
    term: symbol,
    value: usdc(-spent - fee),
  }));
  rows.push({ label: 'Stays in cash', value: usdc(staysInCash) }, { label: 'Fees', value: usdc(fees) });

  const intro = bought.length
    ? "Money put in is spread over the stocks that have room under the rules' cap, at today's prices."
    : 'None of its stocks has room under the rules\' cap, so all of it would stay in cash.';
  return propose(intro, `Add ${usdc(amount)}`, rows, { kind: 'add-funds', amount });
}

export function takeOutCashReply({ record, stocks }: Context, amount: number | undefined): Reply {
  const { cash } = standingOf(record, stocks);
  if (!amount) return reply(say(`How much? ${usdc(cash)} is in cash.`));
  if (amount > cash) {
    return reply(
      note('Not enough cash', `Only ${usdc(cash)} is in cash. Sell a stock to free up more.`, 'warning'),
      offer('Sell half of everything'),
    );
  }
  const rows: Fact[] = [
    { label: 'Take out', value: usdc(amount) },
    { label: 'Cash left', value: usdc(cash - amount) },
  ];
  return propose('This takes cash out of the strategy.', `Take out ${usdc(amount)}`, rows, { kind: 'take-out-cash', amount });
}

const shareWords = (share: number) => (share === 1 ? 'all' : share === 0.5 ? 'half' : formatPercent(share));

export function sellReply(context: Context, { symbols, named, share, isEverything }: { symbols: string[]; named?: string; share?: number; isEverything: boolean }): Reply {
  const { record, stocks, now } = context;
  const { positions } = standingOf(record, stocks);
  const heldNames = positions.map(({ symbol }) => symbol);

  if (named) {
    return reply(say(`${named[0]!.toUpperCase()}${named.slice(1)} isn't in this strategy. It holds ${heldNames.join(', ')}.`), offer(...heldNames.map((symbol) => `Sell ${symbol}`)));
  }
  if (!symbols.length && !isEverything && share !== 1) {
    return reply(say('Which stock, and how much of it?'), offer(...heldNames.slice(0, 3).map((symbol) => `Sell all of ${symbol}`), 'Sell half of everything'));
  }

  const chosen = symbols.length ? symbols : heldNames;
  const howMuch = share ?? 1;
  try {
    const lines = saleLines(record, chosen, howMuch, pricer(context), now.toISOString());
    const rows: Fact[] = lines.map(({ symbol, usdc: received }) => ({
      label: positions.find((position) => position.symbol === symbol)?.name ?? symbol ?? '',
      term: `${shareWords(howMuch)} of ${symbol}`,
      value: usdc(received),
    }));
    const received = lines.reduce((sum, { usdc: each }) => sum + each, 0);
    const fees = lines.reduce((sum, { fee = 0 }) => sum + fee, 0);
    rows.push({ label: 'You receive', value: usdc(received) }, { label: 'Fees', value: usdc(fees) });

    const what = symbols.length ? chosen.join(', ') : 'everything';
    const title = howMuch === 1 && !symbols.length ? 'Sell everything' : `Sell ${shareWords(howMuch)} of ${what}`;
    const step = { kind: 'sell' as const, symbols: symbols.length ? symbols : undefined, share: howMuch };
    return propose("Here is the sale at today's prices, with the swap fee taken off.", title, rows, step);
  } catch (error) {
    if (error instanceof LedgerError) return reply(note("Can't sell that", error.message, 'warning'));
    throw error;
  }
}

// Closing: everything sold at today's prices and the cash taken out, all in one step the person confirms
export function closeReply(context: Context): Reply {
  const { record, stocks, now } = context;
  const { positions, cash } = standingOf(record, stocks);
  try {
    const lines = positions.length ? saleLines(record, positions.map(({ symbol }) => symbol), 1, pricer(context), now.toISOString()) : [];
    const rows: Fact[] = lines.map(({ symbol, usdc: received }) => ({
      label: positions.find((position) => position.symbol === symbol)?.name ?? symbol ?? '',
      term: `sell all of ${symbol}`,
      value: usdc(received),
    }));
    const fees = lines.reduce((sum, { fee = 0 }) => sum + fee, 0);
    const takenOut = cash + lines.reduce((sum, { usdc: received }) => sum + received, 0);
    rows.push({ label: 'Fees', value: usdc(fees) }, { label: 'You take out', value: usdc(takenOut) });
    return propose('This sells everything at today\'s prices and takes the cash out. The strategy is then closed: it is kept to read, and can be deleted.', 'Close strategy', rows, { kind: 'close' });
  } catch (error) {
    if (error instanceof LedgerError) return reply(note("Can't close it", error.message, 'warning'));
    throw error;
  }
}

function ruleCapping({ rules }: Context) {
  return rules.rules.find(({ setting }) => setting?.type === 'max-weight');
}

// "Put 40% in Tesla", "add more NVIDIA": a stock can't be bought on its own, and the rules cap how much of the strategy one can be
export function moreOfReply(context: Context, { symbol, named, target }: { symbol?: string; named?: string; target?: number }): Reply {
  const { record, stocks } = context;
  if (!symbol) {
    const word = named ? `${named[0]!.toUpperCase()}${named.slice(1)}` : 'That stock';
    return reply(
      say(`${word} isn't in this strategy, and the stocks are fixed once the rules are locked. To try a different set, change the rules.`),
      links(link(CHANGE_RULES, 'adapt', record.id)),
    );
  }

  const position: Position | undefined = standingOf(record, stocks).positions.find((held) => held.symbol === symbol);
  const cap = capOf(record);
  const capping = ruleCapping(context);

  if (position && cap && capping && target !== undefined && target > cap) {
    return reply(
      note(`Refused · rule ${capping.id} · ${capping.label.toLowerCase()}`, `I won't put ${formatPercent(target)} in ${position.name}. A chat message can't change a locked rule. You can change the rule itself.`, 'negative'),
      links(link(CHANGE_RULES, 'adapt', record.id)),
    );
  }

  const now = position ? `${position.name} is ${formatPercent(position.weight)} of it now. ` : '';
  const atCap = position && cap && position.weight >= cap * 0.98 ? `That is right at the ${formatPercent(cap)} cap, so it has no room. ` : '';
  return reply(
    say(`${now}${atCap}I can't buy one stock on its own. Money you add is spread over the stocks that have room under the cap, and selling a stock frees cash.`),
    offer('Add 100 USDC', 'What do I hold?'),
  );
}

export function lockedReply({ record, rules }: Context, what: 'rules' | 'stocks'): Reply {
  if (!rules.isConfirmed) {
    return reply(say(`The ${what} aren't locked yet: you can change them on the Rules page, then confirm.`), links(link('Edit rules', 'rules', record.id)));
  }
  const text =
    what === 'rules'
      ? "The rules are locked while it trades, so a chat message can't change them. You can change the rules themselves."
      : "The stocks are fixed once the rules are locked. To try a different set, change the rules.";
  return reply(say(text), links(link(CHANGE_RULES, 'adapt', record.id)));
}
