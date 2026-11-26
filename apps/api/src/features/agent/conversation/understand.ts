import type { Stock } from '@/features/market/types/market.types';

// What the person is asking for, in the few things the agent can do or say about a strategy. Anything else is `unknown`, and the agent says
// what it can do instead of guessing.
export type Intent =
  | { kind: 'standing' }
  | { kind: 'holdings'; symbols: string[] }
  | { kind: 'rules' }
  | { kind: 'cash' }
  | { kind: 'research' }
  | { kind: 'add-funds'; amount?: number }
  | { kind: 'take-out-cash'; amount?: number }
  // `symbols` is empty when no stock was named; `named` is what was said, for a stock that is not in the strategy
  // `isEverything` is "sell half of everything": no stock is named, but it is every one of them that is meant
  | { kind: 'sell'; symbols: string[]; named?: string; share?: number; isEverything: boolean }
  | { kind: 'more-of'; symbol?: string; named?: string; target?: number }
  | { kind: 'close' }
  | { kind: 'delete' }
  | { kind: 'change-rules' }
  | { kind: 'change-stocks' }
  | { kind: 'help' }
  | { kind: 'unknown' };

type Known = Pick<Stock, 'symbol' | 'name'>;

const WORDS = {
  close: /\b(close (it|this|the strategy)|stop trading|shut (it )?down|wind (it )?down|end (it|the strategy|trading))\b/,
  deleteIt: /\b(delete|trash|get rid of|remove (it|this|the strategy))\b/,
  sell: /\b(sell|exit|liquidate|dump|cash out|close out)\b/,
  everything: /\b(everything|all of it|every stock|all (of )?(my|the) (stocks|holdings|positions))\b/,
  takeOut: /\b(withdraw|take (it |some |money )?(out|off)|remove)\b/,
  buyMore: /\b(buy|more|increase|raise|bigger|overweight|boost|top up|put|invest|add|go)\b/,
  addFunds: /\b(add|deposit|put in|put|top up|fund|invest|contribute|transfer)\b/,
  changeRules: /\b(change|raise|lower|loosen|tighten|edit|update|remove|drop|delete|set|add|make)\b.*\b(rules?|caps?|limits?|stop[- ]?loss|take[- ]?profit|budget|liquidity)\b|\b(stop[- ]?loss|take[- ]?profit)\b/,
  changeStocks: /\b(swap|replace|switch)\b|\b(add|include)\b.*\b(another|a (\w+ )?stock)\b|\bfifth stock\b/,
  rules: /\b(rules?|limits?|caps?|allowed|constraints?|stop)\b/,
  research: /\b(research|backtest|results?|verdict|findings?|tested|test)\b/,
  cash: /\bcash\b/,
  holdings: /\b(hold|holding|holdings|own|owns|positions?|stocks?|allocation|weights?|what('s| is) in)\b/,
  standing: /\b(how|doing|perform\w*|worth|value|profit|gains?|returns?|status|up|down|loss|losing|making)\b/,
  help: /\b(help|what can you|what do you do|can you)\b/,
} as const;

const SHARES: [RegExp, number][] = [
  [/\b(half)\b/, 0.5],
  [/\b(quarter)\b/, 0.25],
  [/\b(third)\b/, 1 / 3],
  [/\b(all|everything|entire|whole|completely)\b/, 1],
];

// "40%" or "40 percent" is a share; a plain number is money
const PERCENT = /(\d+(?:\.\d+)?)\s*(?:%|percent|per cent)/;
const MONEY = /(?:\$\s*)?(\d[\d,]*(?:\.\d+)?)\s*(k\b)?(?!\s*(?:%|percent|per cent))/;

function percentIn(text: string) {
  const found = PERCENT.exec(text);
  return found ? Number(found[1]) / 100 : undefined;
}

function amountIn(text: string) {
  const found = MONEY.exec(text.replace(PERCENT, ' '));
  if (!found) return undefined;
  const amount = Number(found[1]!.replace(/,/g, '')) * (found[2] ? 1000 : 1);
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

// Company names that start with these say nothing of which company it is
const NOT_A_NAME = new Set(['the', 'inc', 'corp', 'class', 'co', 'ltd', 'plc', 'group', 'holdings']);

// Short tickers that are also words people write ("sell all", "buy now"), which would name a stock nobody meant
const EVERYDAY_WORDS = new Set(['all', 'now', 'new', 'one', 'low', 'big', 'key', 'has', 'out', 'can', 'add', 'buy', 'put', 'hold', 'half', 'cash', 'more', 'best', 'good', 'next', 'real', 'true', 'cap']);

// A stock is named by its ticker or by the first word of its company's name ("Amazon", "AMZN"); the token's own "c" on the end is left off.
function namesOf({ symbol, name }: Known) {
  const ticker = symbol.replace(/c$/, '').toLowerCase();
  const company = name.split(/[\s.,]+/).find((word) => !NOT_A_NAME.has(word.toLowerCase()))?.toLowerCase() ?? '';
  const names = [symbol.toLowerCase(), ticker, company].filter((word) => word.length >= 3 && !EVERYDAY_WORDS.has(word));
  return [...new Set(names)];
}

const escape = (word: string) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/// The stocks a message names, each once, in the order they are named
export function stocksNamed(text: string, stocks: Known[]) {
  const found = stocks.flatMap((stock) =>
    namesOf(stock).flatMap((word) => {
      const at = text.search(new RegExp(`\\b${escape(word)}\\b`));
      return at === -1 ? [] : [{ stock, at, word }];
    }),
  );
  const firstFirst = found.toSorted((a, b) => a.at - b.at);
  return [...new Map(firstFirst.map(({ stock, word }) => [stock.symbol, { stock, word }])).values()];
}

function shareIn(text: string) {
  const percent = percentIn(text);
  if (percent !== undefined) return Math.min(percent, 1);
  return SHARES.find(([words]) => words.test(text))?.[1];
}

export function understand(message: string, { held, listed }: { held: Known[]; listed: Known[] }): Intent {
  const text = message.toLowerCase();
  const heldNamed = stocksNamed(text, held).map(({ stock }) => stock.symbol);
  const anyNamed = stocksNamed(text, [...held, ...listed]);
  const outsider = anyNamed.find(({ stock }) => !heldNamed.includes(stock.symbol));

  if (WORDS.close.test(text)) return { kind: 'close' };
  if (WORDS.deleteIt.test(text)) return { kind: 'delete' };
  if (WORDS.changeStocks.test(text)) return { kind: 'change-stocks' };
  if (WORDS.changeRules.test(text) && !anyNamed.length) return { kind: 'change-rules' };

  if (WORDS.sell.test(text)) {
    const named = heldNamed.length ? undefined : outsider?.word;
    return { kind: 'sell', symbols: heldNamed, named, share: shareIn(text), isEverything: WORDS.everything.test(text) };
  }

  if (WORDS.takeOut.test(text)) return { kind: 'take-out-cash', amount: amountIn(text) };

  if (anyNamed.length && WORDS.buyMore.test(text)) {
    const [first] = heldNamed.length ? heldNamed : [undefined];
    return { kind: 'more-of', symbol: first, named: first ? undefined : outsider?.word, target: percentIn(text) };
  }

  if (WORDS.changeRules.test(text)) return { kind: 'change-rules' };
  if (WORDS.addFunds.test(text) && !WORDS.rules.test(text)) return { kind: 'add-funds', amount: amountIn(text) };
  if (WORDS.rules.test(text)) return { kind: 'rules' };
  if (WORDS.research.test(text)) return { kind: 'research' };
  if (WORDS.cash.test(text)) return { kind: 'cash' };
  if (WORDS.holdings.test(text) || heldNamed.length) return { kind: 'holdings', symbols: heldNamed };
  if (WORDS.standing.test(text)) return { kind: 'standing' };
  if (WORDS.help.test(text)) return { kind: 'help' };
  return { kind: 'unknown' };
}
