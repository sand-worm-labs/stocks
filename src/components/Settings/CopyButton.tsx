"use client"

import { buttonVariants } from "@/components/Button/Button"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"

export function CopyButton({ text }: { text: string }) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className={buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-20" })}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  )
}
