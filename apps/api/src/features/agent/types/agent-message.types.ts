import type { RunPart, RunStatus } from '@/features/research/types/research-chat.types';
import type { Tone } from '@/features/research/types/tone.types';

// Where a link in a message leads, by the name of the page. The web app knows the addresses.
export type AgentRoute = 'rules' | 'research' | 'report' | 'adapt' | 'buy' | 'activity';

export type AgentAction = { label: string; route: AgentRoute; slug: string; intent: 'dark' | 'outline' | 'link' };

export type Fact = { label: string; value: string; term?: string };

export type ProposalStatus = 'pending' | 'working' | 'done' | 'cancelled' | 'failed';

// What a message is made of. A new kind of thing the agent can show is a new member here, and a component for it in the web app.
export type AgentBlock =
  | { type: 'text'; text: string }
  | { type: 'facts'; title: string; rows: Fact[] }
  | { type: 'rules'; title: string; note?: string; rules: { id: number; label: string; state: 'holds' | 'broken'; detail?: string }[] }
  | { type: 'note'; label: string; text: string; tone?: Tone }
  | { type: 'chips'; label?: string; chips: string[] }
  | { type: 'actions'; actions: AgentAction[] }
  // What Sandworm's agent does while it researches in the notebook, kept as it goes: its thinking, the cells it writes and runs, and what it says
  | { type: 'sandworm-run'; status: RunStatus; notebookUrl?: string; runner?: 'sandworm' | 'agent'; parts: RunPart[] }
  // A money step the agent asks the person to confirm. Stored without its `status` and `id`, which are the message's own.
  | { type: 'proposal'; id: string; title: string; rows: Fact[]; status: ProposalStatus; confirmLabel: string };

// The step itself, in the words the strategy's own steps take
export type ProposedStep =
  | { kind: 'add-funds'; amount: number }
  | { kind: 'take-out-cash'; amount: number }
  | { kind: 'sell'; symbols?: string[]; share: number }
  // Ends the strategy: everything sold and the cash taken out
  | { kind: 'close' };

// A step proposed in a message, and what became of it. It is carried out once, and only after the person confirms.
export type Proposal = { step: ProposedStep; title: string; rows: Fact[]; confirmLabel: string; status: ProposalStatus };

// A message as the app draws it
export type AgentMessage = { id: string; from: 'user' | 'agent'; blocks: AgentBlock[]; at: string };

// What the agent says back: the blocks of its message, and a step it wants confirmed, if any
export type Reply = { blocks: AgentBlock[]; proposal?: Omit<Proposal, 'status'> };
