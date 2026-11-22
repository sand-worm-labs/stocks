"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { buttonVariants } from "@/components/Button/Button"
import { Dialog, DialogContent, DialogDescription, DialogTrigger } from "@/components/ui/dialog"

import { BuyReview, type BuyReviewProps } from "./BuyReview"

type ReviewAndBuyProps = BuyReviewProps & {
  label?: string
  intent?: "dark" | "outline"
  // Open as soon as the page shows, and go here when it is closed
  startOpen?: { closeHref: string }
}

// The button that opens the review of a purchase over the page it was pressed on
export function ReviewAndBuy({ label = "Review & buy", intent = "dark", startOpen, ...review }: ReviewAndBuyProps) {
  const router = useRouter()
  const [open, setOpen] = useState(Boolean(startOpen))

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next && startOpen) router.push(startOpen.closeHref)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger className={buttonVariants({ intent, size: "compact" })}>{label}</DialogTrigger>
      <DialogContent aria-label="Review and buy">
        <DialogDescription className="sr-only">
          What buying would do: the amounts, the fees and the checks, to read before you buy.
        </DialogDescription>
        <BuyReview {...review} onBought={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
