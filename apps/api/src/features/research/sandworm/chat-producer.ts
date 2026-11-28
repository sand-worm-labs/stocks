import { getDailyPrices } from "@/features/research/prices"
import type { Producer } from "@/features/strategies/lifecycle/strategy-lifecycle"
import type { AgentStep } from "@/features/research/types/agent-step.types"
import type { ResearchChatLog, RunPart } from "@/features/research/types/research-chat.types"
import type { Stock } from "@/features/market/types/market.types"
import type { PackFor } from "@/features/research/idea-pack"

import { addToAnswer, type Answer, emptyAnswer, latestSaid } from "@/infrastructure/sandworm/sandworm-chat"
import { createSandwormClient, type SandwormClient, SandwormError } from "@/infrastructure/sandworm/sandworm.client"
import { pricesCell } from "./notebooks"
import { inputsFor, printed, resultOf } from "./template-producer"
import { askForResearch, askToFix, briefMarkdown, problemsWith } from "./research-brief"

// What this producer asks of Sandworm: a notebook, and its chat
export type ChatClient = Pick<
  SandwormClient,
  "workspaceId" | "assistantModel" | "createNotebook" | "addCells" | "startChat" | "sendMessage" | "streamAnswer" | "results"
>

export const CHAT_STEPS = ["Read the idea", "Get prices", "Sandworm researches", "Check what it printed", "Results"] as const

const ASKED_STEP = 2

// The run as the person sees it. What the agent says, or the cell it is making, is on the step that is going.
function progressOf(done: number, said = "", url?: string): AgentStep[] {
  return CHAT_STEPS.map((label, i) => ({
    label,
    state: i < done ? "done" : i === done ? "running" : "waiting",
    ...(i === ASKED_STEP && url && { url }),
    ...(i === done && said && { note: said }),
  }))
}

// What the agent is doing, in a line: the cell it is making or has run, or else the last thing it said
function doing(answer: Answer) {
  const action = answer.actions.at(-1)
  if (action) return action.state === "making" ? `Writing “${action.title}”` : `Ran “${action.title}”`
  return latestSaid(answer)
}

type Options = {
  baseUrl: string
  client?: (token: string) => ChatClient
  getPrices?: typeof getDailyPrices
  market?: () => Promise<Stock[]>
  // What the market holds for the idea, handed to the agent in the brief
  packFor?: PackFor
  // How many times the agent is asked to put right what it printed, before the run is called failed
  mostFixes?: number
}

// Does the research in Sandworm's own chat, as the person, the way they would in a notebook: a notebook with the brief and the real prices in
// it, and the chat's agent asked to do the research there. It writes the cells and runs them as it does for anyone, and what it says is on
// the run as it goes. What it printed is read back, and if something is missing it is asked to put that right before the report is written.
export function createSandwormChatProducer({
  baseUrl,
  client = (token) => createSandwormClient({ baseUrl, token }),
  getPrices = getDailyPrices,
  market = async () => [],
  packFor,
  mostFixes = 2,
}: Options): Producer {
  return {
    runner: "sandworm",
    needsSandworm: true,
    async run(record, { sandwormToken, progress = async () => {}, chatLog = async () => {} }) {
      if (!sandwormToken) throw new SandwormError("Sandworm has signed you out. Sign in again")
      await progress(progressOf(1))
      const found = await inputsFor(record, getPrices, await market())
      const { inputs } = found
      const pack = await packFor?.(record.brief).catch(() => undefined)

      await progress(progressOf(2))
      const sandworm = client(sandwormToken)
      const workspaceId = await sandworm.workspaceId()
      const model = await sandworm.assistantModel(workspaceId)
      const notebook = { title: `${inputs.name} · Research` }
      const { id, url } = await sandworm.createNotebook(workspaceId, notebook.title)

      const cells = await sandworm.addCells(workspaceId, id, [
        { type: "markdown", title: "Summary", content: "*Sandworm's agent writes the summary here when the research is done.*" },
        { type: "markdown", title: "Brief", content: briefMarkdown(record, inputs, pack) },
        pricesCell(inputs),
      ])
      const brief = cells[1]
      if (!brief) throw new SandwormError("Sandworm didn't keep the notebook's cells")

      // What the agent does, kept in the strategy's chat as it goes: the rounds before this one, then what it is doing now
      const runStartedAt = record.research?.startedAt ?? new Date().toISOString()
      let before: RunPart[] = []
      const tell = (status: ResearchChatLog["status"], now: RunPart[] = []) =>
        chatLog({ runStartedAt, status, notebookUrl: url, parts: [...before, ...now] })

      let answer = emptyAnswer()
      let lastNote = ""
      const listen = async (chatId: string, messageId: string) => {
        answer = emptyAnswer()
        await sandworm.streamAnswer(chatId, messageId, (event) => {
          answer = addToAnswer(answer, event)
          void tell("running", answer.parts).catch(() => undefined)
          const note = doing(answer)
          if (note === lastNote) return
          lastNote = note
          void progress(progressOf(ASKED_STEP, note, url))
        })
        before = [...before, ...answer.parts]
        answer = emptyAnswer()
        if (before.some((part) => part.type === "error")) throw new SandwormError(`Sandworm's agent stopped: ${before.findLast((part) => part.type === "error")?.message}`)
      }

      await progress(progressOf(ASKED_STEP, "", url))
      await tell("running").catch(() => undefined)
      try {
        const chat = await sandworm.startChat(workspaceId, id, askForResearch(inputs.name), model, [{ id: brief.id, title: "Brief", type: "markdown" }])
        await listen(chat.chatId, chat.messageId)

        for (let fixes = 0; ; fixes++) {
          await progress(progressOf(3, "", url))
          const lines = printed(await sandworm.results(workspaceId, id))
          const problems = problemsWith(lines)
          if (!problems.length) {
            await progress(progressOf(4, "", url))
            const result = resultOf(lines, record, found, { title: notebook.title, url })
            await tell("done").catch(() => undefined)
            return result
          }
          if (fixes >= mostFixes) throw new SandwormError(`Sandworm's agent didn't finish: ${problems.join("; ")}`)

          await progress(progressOf(ASKED_STEP, "Asking it to put that right", url))
          const asked = askToFix(problems)
          before = [...before, { type: "asked", text: asked }]
          const { messageId } = await sandworm.sendMessage(chat.chatId, asked, model)
          await listen(chat.chatId, messageId)
        }
      } catch (error) {
        // The person watching the run is told it ended, and not left with an agent that looks as if it is still working
        await tell("failed").catch(() => undefined)
        throw error
      }
    },
  }
}
