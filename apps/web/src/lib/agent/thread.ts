import type { AgentMessage, ProposalStatus } from "@/types/agent"

// The conversation as the screen holds it. These are the changes to it, each returning a new list and nothing else, so they can be tested.

/// The message with this id replaced, or added at the end when it is new
export function withMessage(messages: AgentMessage[], message: AgentMessage) {
  const isThere = messages.some(({ id }) => id === message.id)
  return isThere ? messages.map((each) => (each.id === message.id ? message : each)) : [...messages, message]
}

/// The proposal in the message with this id, set to a new status
export function withProposalStatus(messages: AgentMessage[], messageId: string, status: ProposalStatus) {
  return messages.map((message) =>
    message.id === messageId
      ? { ...message, blocks: message.blocks.map((block) => (block.type === "proposal" ? { ...block, status } : block)) }
      : message
  )
}

/// What the API has, put over what the screen has, so a message the person sent that is still on its way is not lost when the page looks
/// again. A message of the screen's own (not yet kept) stays at the end.
export function mergeThread(shown: AgentMessage[], kept: AgentMessage[]) {
  const keptIds = new Set(kept.map(({ id }) => id))
  const notYetKept = shown.filter(({ id }) => !keptIds.has(id) && id.startsWith(LOCAL_PREFIX))
  return [...kept, ...notYetKept]
}

export const LOCAL_PREFIX = "local-"

export const hasWaitingStep = (messages: AgentMessage[]) =>
  messages.some(({ blocks }) => blocks.some((block) => block.type === "proposal" && block.status === "pending"))
