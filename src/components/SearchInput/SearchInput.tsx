"use client"

import { PiMagnifyingGlass } from "react-icons/pi"

import { useSearchParam } from "@/hooks/use-search-param"

type SearchInputProps = { param: string; label: string; placeholder: string }

export function SearchInput({ param, label, placeholder }: SearchInputProps) {
  const [value, setValue] = useSearchParam(param)

  return (
    <div className="relative min-w-0 flex-1 md:max-w-sm">
      <PiMagnifyingGlass aria-hidden="true" className="text-ink-400 absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="bg-base-600 placeholder:text-ink-300 focus:ring-primary dark:bg-base-400 dark:border-border-tertiary h-9 w-full rounded-lg border border-transparent pr-3 pl-9 text-sm transition focus:ring focus:outline-none"
      />
    </div>
  )
}
