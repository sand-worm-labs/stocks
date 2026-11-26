import { formatPercent } from '@/common/utils/format';
import type { Fact, Reply } from '@/features/agent/types/agent-message.types';
import { link, links, note, offer, reply, say } from './replies';
import { movement, type Position, type Standing, standingOf, usdc } from './strategy-facts';
import type { Context } from './context';

const weightOf = (position: Position) => `${formatPercent(position.weight)} of the strategy`;

function positionFact(position: Position): Fact {
  return {
    label: position.name,
    term: `${position.symbol} · ${weightOf(position)}`,
    value: `${usdc(position.value)} (${formatPercent(position.change, { signed: true })})`,
  };
}

function holdingsBlock({ positions, cash }: Standing) {
  const rows = positions.map(positionFact);
  if (cash > 0) rows.push({ label: 'Cash', value: usdc(cash) });
  return { type: 'facts' as const, title: 'What it holds', rows };
}

const against = (standing: Standing) =>
  movement(standing.change) === 'level'
    ? `level with the ${usdc(standing.invested)} invested`
    : `${movement(standing.change)} on the ${usdc(standing.invested)} invested`;

type RuleStanding = Context['rules']['rules'][number]['standing'];

// A rule is over its line when it says so, or when it is further than all the way to its limit: the same reading the rules page draws
const isOver = (standing: RuleStanding) => Boolean(standing?.isBroken) || (standing?.closeness ?? 0) > 1;

export function standingReply({ record, stocks, rules }: Context): Reply {
  const standing = standingOf(record, stocks);
  const text = `${record.name} is worth ${usdc(standing.value)} now, ${against(standing)}. Prices are live as of this answer.`;
  const over = rules.rules.filter((rule) => isOver(rule.standing));
  const warnings = over.map(({ id, label, standing: reading }) => note('Over its limit', `Rule ${id}, ${label}: ${reading?.reading}.`, 'warning'));
  return reply(say(text), holdingsBlock(standing), ...warnings);
}

export function holdingsReply({ record, stocks }: Context, symbols: string[]): Reply {
  const standing = standingOf(record, stocks);
  const named = standing.positions.filter(({ symbol }) => symbols.includes(symbol));
  if (!named.length) return reply(say('Here is what it holds.'), holdingsBlock(standing));

  const lines = named.map(
    (position) => `${position.name} is ${weightOf(position)}: worth ${usdc(position.value)}, ${movement(position.change)} on what was paid.`,
  );
  return reply(say(lines.join(' ')), offer('How is it doing?', 'What are my rules?'));
}

export function cashReply({ record, stocks }: Context): Reply {
  const { cash } = standingOf(record, stocks);
  if (cash > 0) return reply(say(`${usdc(cash)} is in cash.`), offer('Take out cash', 'Add 100 USDC'));
  return reply(say('There is no cash: all of it is invested.'), offer('Add 100 USDC'));
}

export function rulesReply({ record, rules }: Context): Reply {
  const intro = rules.isConfirmed
    ? 'These rules are locked while it trades. This is where each one stands.'
    : "These rules aren't locked yet. You can still change them on the Rules page, then confirm.";
  const block = {
    type: 'rules' as const,
    title: 'Your rules',
    note: rules.isConfirmed ? 'Locked' : undefined,
    rules: rules.rules.map(({ id, label, standing }) => ({
      id,
      label,
      state: isOver(standing) ? ('broken' as const) : ('holds' as const),
      detail: standing?.reading,
    })),
  };
  return reply(say(intro), block, ...(rules.isConfirmed ? [] : [links(link('Edit rules', 'rules', record.id))]));
}

export function researchReply({ record }: Context): Reply {
  const result = record.research?.result;
  if (!result) return reply(say("There are no research results yet. I'll have them here as soon as the research is done."));

  const worries = result.checks.filter(({ tone }) => tone !== 'good').slice(0, 2);
  const notes = worries.map(({ tone, text }) => note('Worth knowing', text, tone === 'bad' ? 'negative' : 'warning'));
  return reply(say(result.headline), ...notes, links(link('Open the results', 'report', record.id)));
}

export function helpReply({ isTrading }: { isTrading: boolean }): Reply {
  const trading = isTrading
    ? ' I can add funds, take out cash or sell, and I always ask you to confirm before any money moves.'
    : '';
  const cannot = " I can't change locked rules, or buy a single stock on its own.";
  return reply(
    say(`I can tell you how this strategy is doing, what it holds, where each rule stands and what the research found.${trading}${cannot}`),
    offer('How is it doing?', 'What are my rules?', ...(isTrading ? ['Add 100 USDC'] : [])),
  );
}
