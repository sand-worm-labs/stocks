"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { DEBOUNCE_MS } from "@/constants/hooks/use-search-param"

export function useSearchParam(param: string) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get(param) ?? ""
  const [value, setValue] = useState(current)

  useEffect(() => {
    if (value === current) return

    const timeout = setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      if (value) next.set(param, value)
      else next.delete(param)
      router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false })
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [value, current, param, pathname, router, searchParams])

  return [value, setValue] as const
}
