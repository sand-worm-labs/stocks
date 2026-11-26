"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { buttonVariants } from "@/components/Button/Button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { PORTFOLIO_STATUS } from "@/constants/portfolio"
import { formatDay } from "@/lib/dates"
import { errorMessage, loadTrash, purgeStrategy, restoreStrategy, type TrashedStrategy } from "@/lib/strategies/client"
import { daysLeftInTrash } from "@/lib/strategies/manage"

type State = { kind: "loading" } | { kind: "failed" } | { kind: "ready"; strategies: TrashedStrategy[] }

// What the person has deleted, kept for a month. Each can be put back, or deleted for good by giving its name, which is the one step here that
// can't be undone.
export function TrashList() {
  const router = useRouter()
  const [state, setState] = useState<State>({ kind: "loading" })
  const [deleting, setDeleting] = useState<TrashedStrategy>()

  // Asking again is a new number: the effect reads the trash whenever it changes
  const [asked, setAsked] = useState(0)
  const load = useCallback(async () => setAsked((count) => count + 1), [])

  useEffect(() => {
    let isCurrent = true
    loadTrash()
      .then((strategies) => isCurrent && setState({ kind: "ready", strategies }))
      .catch(() => isCurrent && setState({ kind: "failed" }))
    return () => {
      isCurrent = false
    }
  }, [asked])

  const restore = async ({ id, name }: TrashedStrategy) => {
    try {
      await restoreStrategy(id)
      toast.success(`${name} is back`, { description: "It is in your strategies again, as it was." })
      await load()
      router.refresh()
    } catch (error) {
      toast.error("Couldn't put it back", { description: errorMessage(error) })
    }
  }

  if (state.kind === "loading") return <p role="status" className="text-ink-400 text-sm">Loading the trash…</p>
  if (state.kind === "failed") {
    return (
      <p role="alert" className="text-sm">
        Couldn&apos;t load the trash.{" "}
        <button type="button" onClick={() => void load()} className="text-primary font-medium hover:underline">Try again</button>
      </p>
    )
  }
  if (state.strategies.length === 0) {
    return (
      <div className="border-border-secondary dark:border-border-tertiary rounded-2xl border p-8 text-center">
        <p className="font-medium">The trash is empty</p>
        <p className="text-ink-400 mt-1 text-sm">A strategy you delete waits here for 30 days, so you can put it back.</p>
      </div>
    )
  }

  return (
    <>
      <ul className="border-border-secondary dark:border-border-tertiary divide-border-secondary dark:divide-border-tertiary flex flex-col divide-y rounded-2xl border">
        {state.strategies.map((strategy) => {
          const left = daysLeftInTrash(strategy.purgesAt)
          const status = PORTFOLIO_STATUS[strategy.status as keyof typeof PORTFOLIO_STATUS]
          return (
            <li key={strategy.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium">{strategy.name}</span>
                <span className="text-ink-400 text-xs">
                  {status?.label ?? strategy.status} · deleted {formatDay(strategy.deletedAt)} · {left === 0 ? "deleted for good today" : `deleted for good in ${left} day${left === 1 ? "" : "s"}`}
                </span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void restore(strategy)} className={buttonVariants({ intent: "outline", size: "compact" })}>
                  Put back
                </button>
                <button type="button" onClick={() => setDeleting(strategy)} className={buttonVariants({ intent: "danger", size: "compact" })}>
                  Delete for good…
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <DeleteForGood strategy={deleting} onClose={() => setDeleting(undefined)} onDone={load} />
    </>
  )
}

function DeleteForGood({ strategy, onClose, onDone }: { strategy?: TrashedStrategy; onClose: () => void; onDone: () => Promise<void> }) {
  const [typed, setTyped] = useState("")
  const [isDeleting, setDeleting] = useState(false)
  const matches = typed.trim() === strategy?.name

  const purge = async () => {
    if (!strategy || !matches) return
    setDeleting(true)
    try {
      await purgeStrategy(strategy.id, typed)
      toast.success(`${strategy.name} was deleted for good`)
      onClose()
      await onDone()
    } catch (error) {
      toast.error("Couldn't delete it", { description: errorMessage(error) })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={Boolean(strategy)} onOpenChange={(isOpen) => { if (!isOpen) { setTyped(""); onClose() } }}>
      <DialogContent aria-label="Delete the strategy for good" className="max-w-[460px]">
        <DialogTitle>Delete {strategy?.name} for good?</DialogTitle>
        <DialogDescription>This can&apos;t be undone. Its chat, activity and record of trades are deleted too. The research notebook stays in your Sandworm workspace.</DialogDescription>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-400">Type the strategy&apos;s name to confirm</span>
          <input
            autoFocus
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void purge()}
            placeholder={strategy?.name}
            className="border-border bg-inputBg dark:border-border-tertiary focus:border-primary w-full rounded-xl border px-3.5 py-2.5 outline-none dark:bg-transparent"
          />
        </label>
        <div className="flex justify-end gap-2">
          <DialogClose className={buttonVariants({ intent: "outline", size: "compact" })}>Cancel</DialogClose>
          <button type="button" onClick={purge} disabled={!matches || isDeleting} className={buttonVariants({ intent: "danger", size: "compact", className: "disabled:opacity-50" })}>
            {isDeleting ? "Deleting…" : "Delete for good"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
