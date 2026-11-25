import { type FlowStepId } from "@/constants/flow"
import { type Tone } from "@/constants/tone"
import type { WorkspacePhase } from "@/types/ui"

export const STATUS: Record<WorkspacePhase, { label: string; tone: Tone }> = {
  rules: { label: "Draft", tone: "warning" },
  researching: { label: "Researching", tone: "info" },
  ready: { label: "Results ready", tone: "positive" },
}

export const STEP: Record<WorkspacePhase, FlowStepId> = { rules: "rules", researching: "research", ready: "report" }
