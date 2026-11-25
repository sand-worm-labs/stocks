"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { buttonVariants } from "@/components/Button/Button"
import { Dialog, DialogContent, DialogDescription, DialogTrigger } from "@/components/ui/dialog"

import { BuyReview, type BuyReviewProps } from "./BuyReview"

type ReviewAndBuyProps = BuyReviewProps & {
  label?: string
  intent?: "dark" | "outline"
  startOpen?: { closeHref: string }
}

export function ReviewAndBuy({ label = "Review and trade", intent = "dark", startOpen, ...review }: ReviewAndBuyProps) {
  const router = useRouter()
  const [open, setOpen] = useState(Boolean(startOpen))

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next && startOpen) router.push(startOpen.closeHref)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger className={buttonVariants({ intent, size: "compact" })}>{label}</DialogTrigger>
      <DialogContent aria-label="Review and trade">
        <DialogDescription className="sr-only">
          What buying would do: the amounts, the fees and the checks, to read before you buy.
        </DialogDescription>
        <BuyReview {...review} onBought={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
