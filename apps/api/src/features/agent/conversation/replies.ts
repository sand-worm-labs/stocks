import type { Tone } from '@/features/research/types/tone.types';
import type { AgentAction, AgentBlock, Reply } from '@/features/agent/types/agent-message.types';

// The small pieces every answer is put together from

export const say = (text: string): AgentBlock => ({ type: 'text', text });

export const offer = (...chips: string[]): AgentBlock => ({ type: 'chips', chips });

export const note = (label: string, text: string, tone?: Tone): AgentBlock => ({ type: 'note', label, text, tone });

export const link = (label: string, route: AgentAction['route'], slug: string, intent: AgentAction['intent'] = 'outline'): AgentAction => ({
  label,
  route,
  slug,
  intent,
});

export const links = (...actions: AgentAction[]): AgentBlock => ({ type: 'actions', actions });

export const reply = (...blocks: AgentBlock[]): Reply => ({ blocks });
