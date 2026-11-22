"use client"

import { usePathname } from "next/navigation"

import type { RouteId } from "@/config/routes"
import { currentTab } from "@/lib/navigation"

// The tab the visitor is in, so it can be marked current.
export function useCurrentTab(tabs: RouteId[]) {
  return currentTab(tabs, usePathname() ?? "/")
}
