"use client"

import { SearchField } from "@/components/ui/search-field"
import { useSearchParam } from "@/hooks/use-search-param"
import { cn } from "@/lib/utils"

type SearchInputProps = { param: string; label: string; placeholder: string; className?: string }

export function SearchInput({ param, label, placeholder, className }: SearchInputProps) {
  const [value, setValue] = useSearchParam(param)

  return (
    <SearchField
      value={value}
      onChange={setValue}
      label={label}
      placeholder={placeholder}
      className={cn("flex-1 md:max-w-sm", className)}
    />
  )
}
