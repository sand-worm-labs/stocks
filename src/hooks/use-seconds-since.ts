"use client"

import { useEffect, useState } from "react"

export function useSecondsSince(time?: number) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  return time === undefined ? 0 : Math.max(0, Math.floor((now - time) / 1000))
}
