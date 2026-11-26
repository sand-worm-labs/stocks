"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { PiDotsThree } from "react-icons/pi"
import { toast } from "sonner"

import { buttonVariants } from "@/components/Button/Button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatAmount } from "@/lib/format"
import { closeStrategy, deleteStrategy, errorMessage, renameStrategy, restoreStrategy } from "@/lib/strategies/client"
import { closeSummary, deleteConsequences, TRASH_DAYS } from "@/lib/strategies/manage"
import { NAME_MAX_LENGTH } from "@/lib/strategies/service"
import { cn } from "@/lib/utils"

type StrategyManageProps = {
  id: string
  name: string
  status: string
  // What it holds, for what closing would sell
  stocks?: number
  value?: number
  cash?: number
}

type Dialogs = "rename" | "close" | "delete"

// What a person can do with a strategy they made, in one place whatever stage it is at. Money is never lost by a slip: a strategy that is
// trading has to be closed before it can be deleted, and a deleted one waits in the trash.
export function StrategyManage({ id, name, status, stocks = 0, value = 0, cash = 0 }: StrategyManageProps) {
  const [open, setOpen] = useState<Dialogs>()
  const isTrading = status === "live"

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className={buttonVariants({ intent: "outline", size: "compact", className: "gap-1.5" })} aria-label={`Manage ${name}`}>
          <PiDotsThree size={18} aria-hidden="true" />
          Manage
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onSelect={() => setOpen("rename")}>Rename</DropdownMenuItem>
          {isTrading && <DropdownMenuItem onSelect={() => setOpen("close")}>Close strategy…</DropdownMenuItem>}
          {isTrading ? (
            // Said, not hidden: the person should know why it can't be deleted and what to do
            <DropdownMenuItem disabled className="flex-col items-start gap-0.5">
              <span>Move to trash</span>
              <span className="text-ink-400 text-xs">Close it first: it holds money</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setOpen("delete")}>Move to trash…</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog id={id} name={name} open={open === "rename"} onClose={() => setOpen(undefined)} />
      <CloseDialog id={id} name={name} stocks={stocks} value={value} cash={cash} open={open === "close"} onClose={() => setOpen(undefined)} />
      <DeleteDialog id={id} name={name} status={status} open={open === "delete"} onClose={() => setOpen(undefined)} />
    </>
  )
}

type DialogProps = { id: string; name: string; open: boolean; onClose: () => void }

function RenameDialog({ id, name, open, onClose }: DialogProps) {
  const router = useRouter()
  const [text, setText] = useState(name)
  const [isSaving, setSaving] = useState(false)
  const next = text.trim().replace(/\s+/g, " ")
  const canSave = next.length > 0 && next !== name && !isSaving

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await renameStrategy(id, next)
      onClose()
      router.refresh()
    } catch (error) {
      toast.error("Couldn't rename it", { description: errorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => (isOpen ? setText(name) : onClose())}>
      <DialogContent aria-label="Rename the strategy" className="max-w-[440px]">
        <DialogTitle>Rename the strategy</DialogTitle>
        <DialogDescription>It changes only the name. Its rules, money and chat stay as they are, and the research notebook keeps its title.</DialogDescription>
        <input
          autoFocus
          aria-label="Strategy name"
          value={text}
          maxLength={NAME_MAX_LENGTH}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void save()}
          className="border-border bg-inputBg dark:border-border-tertiary focus:border-primary w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none dark:bg-transparent"
        />
        <div className="flex justify-end gap-2">
          <DialogClose className={buttonVariants({ intent: "outline", size: "compact" })}>Cancel</DialogClose>
          <button type="button" onClick={save} disabled={!canSave} className={buttonVariants({ intent: "dark", size: "compact", className: "disabled:opacity-50" })}>
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CloseDialog({ id, name, stocks = 0, value = 0, cash = 0, open, onClose }: DialogProps & { stocks: number; value: number; cash: number }) {
  const router = useRouter()
  const [isClosing, setClosing] = useState(false)

  const close = async () => {
    setClosing(true)
    try {
      const { takenOut } = await closeStrategy(id)
      toast.success(`${name} is closed`, { description: `Everything was sold and ${formatAmount(takenOut)} USDC was taken out.` })
      onClose()
      router.refresh()
    } catch (error) {
      toast.error("Couldn't close it", { description: errorMessage(error) })
    } finally {
      setClosing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent aria-label="Close the strategy" className="max-w-[480px]">
        <DialogTitle>Close {name}?</DialogTitle>
        <DialogDescription>{closeSummary({ stocks, value, cash })}</DialogDescription>
        <ul className="text-ink-200 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-6">
          <li>Everything it holds is sold at today&apos;s prices, with the swap fee, and the cash is taken out.</li>
          <li>It stays here, closed: you can still read its results and activity. No money can be put in again.</li>
          <li>When you no longer need it, you can move it to the trash.</li>
        </ul>
        <div className="flex justify-end gap-2">
          <DialogClose className={buttonVariants({ intent: "outline", size: "compact" })}>Cancel</DialogClose>
          <button type="button" onClick={close} disabled={isClosing} className={buttonVariants({ intent: "danger", size: "compact", className: "disabled:opacity-60" })}>
            {isClosing ? "Closing…" : "Sell everything and close"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DeleteDialog({ id, name, status, open, onClose }: DialogProps & { status: string }) {
  const router = useRouter()
  const [isDeleting, setDeleting] = useState(false)

  const remove = async () => {
    setDeleting(true)
    try {
      await deleteStrategy(id)
      onClose()
      // Said with a way back, since it is the one thing here that can be regretted
      toast.success(`${name} is in the trash`, {
        description: `It is kept for ${TRASH_DAYS} days.`,
        action: { label: "Undo", onClick: () => void restoreStrategy(id).then(() => router.refresh()).catch((error) => toast.error("Couldn't put it back", { description: errorMessage(error) })) },
      })
      router.push("/strategies")
      router.refresh()
    } catch (error) {
      toast.error("Couldn't move it to the trash", { description: errorMessage(error) })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent aria-label="Move the strategy to the trash" className="max-w-[480px]">
        <DialogTitle>Move {name} to the trash?</DialogTitle>
        <DialogDescription>It stays there for {TRASH_DAYS} days, and you can put it back any time before then.</DialogDescription>
        <ul className={cn("text-ink-200 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-6")}>
          {deleteConsequences(status).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <DialogClose className={buttonVariants({ intent: "outline", size: "compact" })}>Cancel</DialogClose>
          <button type="button" onClick={remove} disabled={isDeleting} className={buttonVariants({ intent: "danger", size: "compact", className: "disabled:opacity-60" })}>
            {isDeleting ? "Moving…" : "Move to trash"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
