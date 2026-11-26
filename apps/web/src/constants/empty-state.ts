import type { RouteId } from "@/config/routes"

export type EmptyAction = { route: RouteId; label: string }

export const CREATE_STRATEGY: EmptyAction = { route: "newPortfolio", label: "Create a strategy" }
export const LOOK_AROUND: EmptyAction = { route: "markets", label: "or look around the markets first" }
