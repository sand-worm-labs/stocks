import type { Reply } from '@/features/agent/types/agent-message.types';
import type { Context } from './context';
import type { Intent } from './understand';
import { cashReply, closedReply, helpReply, holdingsReply, researchReply, rulesReply, standingReply } from './read-answers';
import { link, links, note, offer, reply, say } from './replies';
import { addFundsReply, closeReply, lockedReply, moreOfReply, sellReply, takeOutCashReply } from './step-proposals';

const WALLET_TRADES = "This strategy trades from your wallet, and trades from it aren't available here yet.";

// Why money can't be moved yet, for a strategy that is not trading, with where to go next
function notTradingReply({ record }: Context): Reply {
  if (record.status === 'unbuildable') {
    return reply(say("This idea can't be built as it was written, so there is nothing to trade."), links(link('Change it', 'adapt', record.id)));
  }
  if (record.stage === 'rules') {
    return reply(say("It isn't trading yet. Confirm the rules and I'll research the idea first."), links(link('Edit rules', 'rules', record.id)));
  }
  if (record.stage === 'researching') {
    return reply(say("It isn't trading yet: the research is still running. I'll have the results here when they're in."), links(link('Watch the research', 'research', record.id)));
  }
  return reply(
    say('It is not trading yet. The research is done, so you can review the results and start it.'),
    links(link('Review and trade', 'buy', record.id, 'dark'), link('Results', 'report', record.id)),
  );
}

const isTrading = ({ record }: Context) => record.status === 'live';

// Deleting is done from the strategy's own page, where the person can see what goes with it. A strategy that holds money is closed first.
function deleteReply({ record }: Context): Reply {
  if (record.status === 'live') {
    return reply(
      say("It is still trading, so it can't be deleted: it holds money. Close it first, which sells everything and takes the cash out. Then it can go to the trash."),
      offer('Close the strategy'),
    );
  }
  return reply(say("You can delete it from the Manage menu at the top of this page. It goes to the trash, with its chat, and stays there for 30 days in case you want it back."));
}
const tradesFromWallet = ({ record }: Context) => record.funding?.mode !== 'paper';

/// What the agent says to one thing the person asked, from the strategy as it stands. What can be said at any stage is said; a step that moves
/// money is only proposed for a strategy that is trading on paper, and is only carried out after the person confirms it.
export function answer(intent: Intent, context: Context): Reply {
  switch (intent.kind) {
    case 'rules':
      return rulesReply(context);
    case 'research':
      return researchReply(context);
    case 'change-rules':
      return lockedReply(context, 'rules');
    case 'change-stocks':
      return lockedReply(context, 'stocks');
    case 'delete':
      return deleteReply(context);
    case 'help':
    case 'unknown':
      return helpReply({ isTrading: isTrading(context) });
  }

  if (context.record.status === 'closed') {
    const isMoney = ['add-funds', 'take-out-cash', 'sell', 'more-of', 'close'].includes(intent.kind);
    return isMoney ? reply(say("This strategy is closed, so there is nothing left to move. It holds nothing.")) : closedReply(context);
  }
  if (!isTrading(context)) return notTradingReply(context);

  switch (intent.kind) {
    case 'standing':
      return standingReply(context);
    case 'holdings':
      return holdingsReply(context, intent.symbols);
    case 'cash':
      return cashReply(context);
  }

  if (tradesFromWallet(context)) return reply(note('Not yet', WALLET_TRADES, 'warning'), offer('How is it doing?'));

  switch (intent.kind) {
    case 'add-funds':
      return addFundsReply(context, intent.amount);
    case 'take-out-cash':
      return takeOutCashReply(context, intent.amount);
    case 'sell':
      return sellReply(context, intent);
    case 'more-of':
      return moreOfReply(context, intent);
    case 'close':
      return closeReply(context);
  }
}
