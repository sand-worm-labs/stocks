import type { ReactNode } from "react"

import type { AgentBlock } from "@/types/agent"

import { ActionsBlock } from "./ActionsBlock"
import { ChipsBlock } from "./ChipsBlock"
import { FactsBlock } from "./FactsBlock"
import { NoteBlock } from "./NoteBlock"
import { ProposalBlock } from "./ProposalBlock"
import { RulesBlock } from "./RulesBlock"
import { StepsBlock } from "./StepsBlock"
import { TextBlock } from "./TextBlock"

type Renderers = { [K in AgentBlock["type"]]: (props: { block: Extract<AgentBlock, { type: K }> }) => ReactNode }

const RENDERERS: Renderers = {
  text: ({ block }) => <TextBlock text={block.text} />,
  steps: StepsBlock,
  facts: FactsBlock,
  rules: RulesBlock,
  note: NoteBlock,
  chips: ChipsBlock,
  actions: ActionsBlock,
  proposal: ProposalBlock,
}

export function BlockView({ block }: { block: AgentBlock }) {
  const Render = RENDERERS[block.type] as (props: { block: AgentBlock }) => ReactNode
  return <Render block={block} />
}
