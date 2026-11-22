"use client"

import { SearchField } from "@/components/ui/search-field"
import { useSearchParam } from "@/hooks/use-search-param"

type SearchInputProps = { param: string; label: string; placeholder: string }

// A search field whose text lives in the page's address
export function SearchInput({ param, label, placeholder }: SearchInputProps) {
  const [value, setValue] = useSearchParam(param)

  return (
    <SearchField
      value={value}
      onChange={setValue}
      label={label}
      placeholder={placeholder}
      className="flex-1 md:max-w-sm"
    />
  )
}
