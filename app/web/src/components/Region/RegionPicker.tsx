"use client"

import { useRouter } from "next/navigation"
import { type ReactNode, useState, useTransition } from "react"
import { PiMagnifyingGlass, PiX } from "react-icons/pi"
import { toast } from "sonner"

import { buttonVariants } from "@/components/Button/Button"
import { CountryFlag } from "@/components/CountryFlag/CountryFlag"
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { EmptyResults } from "@/components/ui/empty-results"
import { SearchField } from "@/components/ui/search-field"
import { saveRegion } from "@/lib/region/actions"
import { COUNTRIES, isRegionSupported } from "@/lib/region/countries"
import { searchBy } from "@/lib/search"
import { cn } from "@/lib/utils"

function RowTag({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <span className="bg-hover-bg text-ink-200 flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-xs dark:bg-white/10">
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", tone === "warning" ? "bg-amber-500" : "bg-info")}
      />
      {children}
    </span>
  )
}

type RegionPickerProps = {
  region: string
  children?: ReactNode
  className?: string
}

export function RegionPicker({ region, children, className }: RegionPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const countries = searchBy(COUNTRIES, query, ({ name, code }) => `${name} ${code}`)

  const choose = (code: string, name: string) =>
    startTransition(async () => {
      await saveRegion(code)
      router.refresh()
      setOpen(false)
      toast.success(`You live in ${name}`)
    })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <DialogTrigger
        className={className ?? buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-0 px-3" })}
      >
        {children ?? "Change"}
      </DialogTrigger>
      <DialogContent
        aria-label="Where you live"
        aria-describedby={undefined}
        className="bg-dialog-surface w-[360px] max-w-[calc(100vw-2rem)] gap-0 rounded-3xl p-0 shadow-[0_24px_32px_-24px_rgba(0,0,0,0.24)] sm:rounded-3xl sm:p-0"
      >
        <div className="relative mt-6 flex h-6 items-center justify-center px-6 pt-0">
          <DialogTitle className="text-dialog-ink text-lg font-normal">Where do you live?</DialogTitle>
          <DialogClose
            aria-label="Close"
            className="text-ink-300 hover:text-ink-100 absolute right-6 flex size-6 items-center justify-center rounded-full transition-colors"
          >
            <PiX size={18} aria-hidden="true" />
          </DialogClose>
        </div>

        <SearchField
          appearance="card"
          label="Search countries"
          placeholder={`Search through ${COUNTRIES.length} countries…`}
          value={query}
          onChange={setQuery}
          className="mx-6 mt-5"
        />

        <ul
          className={cn(
            "mt-2 flex h-[260px] flex-col gap-1.5 overflow-y-auto px-6 pb-6 transition-opacity",
            pending && "pointer-events-none opacity-60"
          )}
        >
          {countries.map(({ code, name }) => (
            <li key={code}>
              <button
                type="button"
                onClick={() => choose(code, name)}
                className="bg-block-surface hover:bg-hover-bg text-dialog-ink flex h-[52px] w-full items-center gap-3 rounded-xl p-3 text-left text-base shadow-[0_1px_2px_rgba(24,39,75,0.04)] transition-colors duration-200 ease-out"
              >
                <CountryFlag code={code} className="size-7" />
                <span className="flex-1 truncate">{name}</span>
                {code === region && <RowTag>Current</RowTag>}
                {!isRegionSupported(code) && <RowTag tone="warning">Not offered</RowTag>}
              </button>
            </li>
          ))}
          {!countries.length && (
            <EmptyResults
              icon={PiMagnifyingGlass}
              title="No country found"
              hint="Check the spelling, or try fewer letters."
            />
          )}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
