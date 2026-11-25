"use client"

import { usePathname } from "next/navigation"

import type { RouteId } from "@/config/routes"
import { currentTab } from "@/lib/navigation"

export function useCurrentTab(tabs: RouteId[]) {
  return currentTab(tabs, usePathname() ?? "/")
}
