"use client"

import type { ReactNode } from "react"

import { buttonVariants } from "@/components/Button/Button"
import { cn } from "@/lib/utils"

type ContinueButtonProps = {
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
  children?: ReactNode
}

// The one way forward on every step: a black pill 96 by 40, as it is in the reference
export function ContinueButton({ onClick, disabled, type = "button", children = "Continue" }: ContinueButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        buttonVariants({ intent: "dark", size: "compact" }),
        "h-10 min-w-24 px-4 text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-40"
      )}
    >
      {children}
    </button>
  )
}
