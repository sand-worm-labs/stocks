"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { decideStep, loadThread, sendMessage } from "@/lib/agent/client"
import { hasRunningWork, LOCAL_PREFIX, mergeThread, withMessage, withProposalStatus } from "@/lib/agent/thread"
import { errorMessage } from "@/lib/strategies/client"
import type { AgentMessage } from "@/types/agent"

export type ThreadState = "loading" | "ready" | "failed"

const FOLLOW_MS = 3000

const said = (id: string, from: AgentMessage["from"], text: string): AgentMessage => ({
  id: `${LOCAL_PREFIX}${id}`,
  from,
  blocks: [{ type: "text", text }],
})

// The conversation about one strategy, kept by the API for the signed-in person: loaded when the page opens, added to as they talk, and
// looked at again whenever they come back to the tab, so it is the same on every page, tab and device.
export function useAgentThread(strategyId: string) {
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [state, setState] = useState<ThreadState>("loading")
  const [thinking, setThinking] = useState(false)
  const count = useRef(0)
  const isBusy = useRef(false)

  const load = useCallback(async () => {
    try {
      const thread = await loadThread(strategyId)
      setMessages((shown) => mergeThread(shown, thread.messages))
      setSuggestions(thread.suggestions)
      setState("ready")
    } catch {
      setState((current) => (current === "ready" ? current : "failed"))
    }
  }, [strategyId])

  useEffect(() => {
    void load()
    const lookAgain = () => {
      if (document.visibilityState === "visible" && !isBusy.current) void load()
    }
    document.addEventListener("visibilitychange", lookAgain)
    return () => document.removeEventListener("visibilitychange", lookAgain)
  }, [load])

  const refreshSuggestions = useCallback(async () => {
    const thread = await loadThread(strategyId).catch(() => undefined)
    if (thread) setSuggestions(thread.suggestions)
  }, [strategyId])

  // While Sandworm's agent is at work its steps are kept in the conversation as it goes, so it is looked at again every few seconds to follow it
  const isAgentWorking = hasRunningWork(messages)
  useEffect(() => {
    if (!isAgentWorking) return
    const timer = setInterval(() => {
      if (!isBusy.current) void load()
    }, FOLLOW_MS)
    return () => clearInterval(timer)
  }, [isAgentWorking, load])

  const send = useCallback(
    async (text: string) => {
      const id = String(++count.current)
      const asked = said(`you-${id}`, "user", text)
      isBusy.current = true
      setMessages((shown) => [...shown, asked])
      setThinking(true)
      try {
        const { messages: kept, superseded } = await sendMessage(strategyId, text)
        setMessages((shown) => {
          const withoutAsked = shown.filter(({ id: each }) => each !== asked.id)
          const older = superseded.reduce((all, each) => withProposalStatus(all, each, "cancelled"), withoutAsked)
          return kept.reduce(withMessage, older)
        })
        void refreshSuggestions()
      } catch (error) {
        setMessages((shown) => [...shown, said(`error-${id}`, "agent", `I couldn't answer that. ${errorMessage(error)}`)])
      } finally {
        isBusy.current = false
        setThinking(false)
      }
    },
    [strategyId, refreshSuggestions]
  )

  const decide = useCallback(
    async (messageId: string, decision: "confirm" | "cancel") => {
      isBusy.current = true
      setMessages((shown) => withProposalStatus(shown, messageId, decision === "confirm" ? "working" : "cancelled"))
      try {
        const { messages: kept } = await decideStep(strategyId, messageId, decision)
        setMessages((shown) => kept.reduce(withMessage, shown))
      } catch (error) {
        setMessages((shown) => [...withProposalStatus(shown, messageId, "failed"), said(`error-${++count.current}`, "agent", errorMessage(error))])
      } finally {
        isBusy.current = false
      }
    },
    [strategyId]
  )

  return { messages, suggestions, state, thinking, send, decide, retry: load }
}
