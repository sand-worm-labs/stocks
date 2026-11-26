import { describe, expect, it } from "vitest"

import { hasWaitingStep, LOCAL_PREFIX, mergeThread, withMessage, withProposalStatus } from "@/lib/agent/thread"
import type { AgentMessage } from "@/types/agent"

const say = (id: string, from: AgentMessage["from"] = "agent"): AgentMessage => ({ id, from, blocks: [{ type: "text", text: id }] })
const proposal = (id: string, status: "pending" | "done"): AgentMessage => ({
  id,
  from: "agent",
  blocks: [{ type: "proposal", id, title: "Add 50.00 USDC", rows: [], status, confirmLabel: "Add 50.00 USDC" }],
})

describe("the conversation as the screen holds it", () => {
  it("adds a message that is new, and replaces one that is already there", () => {
    const added = withMessage([say("a")], say("b"))
    expect(added.map(({ id }) => id)).toEqual(["a", "b"])

    const replaced = withMessage(added, proposal("a", "done"))
    expect(replaced.map(({ id }) => id)).toEqual(["a", "b"])
    expect(replaced[0]?.blocks[0]?.type).toBe("proposal")
  })

  it("changes the status of one step, and nothing else", () => {
    const messages = [proposal("a", "pending"), proposal("b", "pending"), say("c")]
    const changed = withProposalStatus(messages, "a", "working")

    expect(changed[0]?.blocks[0]).toMatchObject({ status: "working" })
    expect(changed[1]).toBe(messages[1])
    expect(changed[2]).toBe(messages[2])
  })

  it("puts what the API keeps over what is shown, and keeps a message of the screen's own that is not kept yet", () => {
    const shown = [say("a"), say(`${LOCAL_PREFIX}you-1`, "user")]
    const kept = [say("a"), say("b")]
    expect(mergeThread(shown, kept).map(({ id }) => id)).toEqual(["a", "b", `${LOCAL_PREFIX}you-1`])
  })

  it("drops a message that was shown but is no longer kept", () => {
    expect(mergeThread([say("a"), say("gone")], [say("a")]).map(({ id }) => id)).toEqual(["a"])
  })

  it("says whether a step is waiting for the person's confirm", () => {
    expect(hasWaitingStep([say("a"), proposal("b", "pending")])).toBe(true)
    expect(hasWaitingStep([say("a"), proposal("b", "done")])).toBe(false)
  })
})
