"use client"

import { PiCheck, PiFunnelSimple, PiX } from "react-icons/pi"

import { AppLink } from "@/components/AppLink/AppLink"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { RouteId } from "@/config/routes"

type FilterMenuProps = {
  route: RouteId
  param: string
  options: { value: string; label: string; count?: number }[]
  active: string
  defaultValue: string
  keep?: Record<string, string>
}

export function FilterMenu({ route, param, options, active, defaultValue, keep }: FilterMenuProps) {
  const isFiltered = active !== defaultValue

  return (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger className="text-ink-200 hover:bg-hover-bg hover:border-hover-border dark:hover:bg-base-600 focus-visible:ring-primary/50 flex h-7 items-center gap-2 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px]">
          <PiFunnelSimple size={16} aria-hidden="true" />
          <span>Filter</span>
          {isFiltered && <Badge className="ml-1 rounded-md px-1 py-0.5">1</Badge>}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="flex w-56 flex-col gap-0.5">
          {options.map(({ value, label, count }) => (
            <DropdownMenuItem key={value} asChild>
              <AppLink route={route} query={{ ...keep, [param]: value }} isCurrent={value === active}>
                <span>{label}</span>
                <span className="text-ink-400 flex items-center gap-2">
                  {count}
                  {value === active && isFiltered && (
                    <span className="bg-primary flex size-4 items-center justify-center rounded">
                      <PiCheck size={12} aria-hidden="true" className="text-white" />
                    </span>
                  )}
                </span>
              </AppLink>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {isFiltered && (
        <Badge className="text-ink-400 gap-1 rounded-md bg-[rgba(177,182,196,0.1)] px-2 py-0.5 font-medium">
          <span>{options.find(({ value }) => value === active)?.label}</span>
          <AppLink
            route={route}
            query={{ ...keep, [param]: defaultValue }}
            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
          >
            <PiX size={12} aria-label="Clear filter" />
          </AppLink>
        </Badge>
      )}
    </div>
  )
}
