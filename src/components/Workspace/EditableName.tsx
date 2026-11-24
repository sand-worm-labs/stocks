"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { PiPencilSimple } from "react-icons/pi"
import { toast } from "sonner"

import { errorMessage, renameStrategy } from "@/lib/strategies/client"
import { NAME_MAX_LENGTH } from "@/lib/strategies/service"
import { cn } from "@/lib/utils"

const TITLE = "text-2xl font-medium md:text-[32px] md:leading-10"

// A strategy's name, which its owner can change: press the pencil or the name, type, and Enter or leaving the box keeps it, Escape
// puts it back. The new name shows at once and goes back if it can't be saved.
export function EditableName({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const [shown, setShown] = useState(name)
  const [draft, setDraft] = useState<string>()
  const saving = useRef(false)

  const save = async () => {
    if (draft === undefined || saving.current) return
    const next = draft.trim().replace(/\s+/g, " ")
    setDraft(undefined)
    if (!next || next === shown) return

    const before = shown
    saving.current = true
    setShown(next)
    try {
      setShown((await renameStrategy(id, next)).name)
      router.refresh()
    } catch (error) {
      setShown(before)
      toast.error("Couldn't rename it", { description: errorMessage(error) })
    } finally {
      saving.current = false
    }
  }

  if (draft !== undefined) {
    return (
      <input
        autoFocus
        aria-label="Strategy name"
        value={draft}
        maxLength={NAME_MAX_LENGTH}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={save}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur()
          if (event.key === "Escape") setDraft(undefined)
        }}
        className={cn(TITLE, "border-ink-400 w-full max-w-xl border-b bg-transparent outline-none")}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setDraft(shown)}
      aria-label={`Rename ${shown}`}
      className="group flex items-center gap-2 text-left"
    >
      <h1 className={TITLE}>{shown}</h1>
      <PiPencilSimple
        aria-hidden="true"
        size={18}
        className="text-ink-400 group-hover:text-ink-100 flex-none transition-colors"
      />
    </button>
  )
}
