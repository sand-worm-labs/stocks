import type { AgentStep } from "@/types/agent"

class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

async function call<T>(path: string, method: "POST" | "PATCH", body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) throw new ApiError(data.error ?? "Something went wrong. Try again in a moment", response.status)
  return data as T
}

type TradeRequest =
  | { mode: "paper"; amount: number }
  | { mode: "live"; amount: number; address: string; expires: string; signature: string }

export const createStrategy = (brief: string) => call<{ id: string }>("/api/strategies", "POST", { brief })
export const renameStrategy = (id: string, name: string) =>
  call<{ name: string }>(`/api/strategies/${id}`, "PATCH", { name })
export const confirmRules = (id: string) => call<{ stage: string }>(`/api/strategies/${id}/confirm`, "POST")
export const retryResearch = (id: string) => call<{ stage: string }>(`/api/strategies/${id}/retry`, "POST")
export const finishResearch = (id: string) => call<{ stage: string; error?: string; progress?: AgentStep[] }>(`/api/strategies/${id}/ready`, "POST")
export const tradeStrategy = (id: string, request: TradeRequest) =>
  call<{ id: string }>(`/api/strategies/${id}/trade`, "POST", request)

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Try again in a moment"
