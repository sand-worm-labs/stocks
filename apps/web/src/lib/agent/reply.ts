import type { AgentMessage } from "@/types/agent"

export function replyTo(text: string, id: string): AgentMessage {
  return {
    id,
    from: "agent",
    blocks: [
      {
        type: "text",
        text: `Noted: “${text}”. I'll apply it to the rules and tell you what changes before anything runs.`,
      },
      {
        type: "steps",
        steps: [
          { label: "Read your change", state: "done" },
          { label: "Checked it against your rules", state: "done" },
        ],
      },
    ],
  }
}
