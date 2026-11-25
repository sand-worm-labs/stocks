"use client"

import { useState } from "react"
import { PiDownloadSimple, PiShareNetwork } from "react-icons/pi"
import { toast } from "sonner"

import { buttonVariants } from "@/components/Button/Button"
import { errorMessage, shareReport } from "@/lib/strategies/client"

// Save the report as a PDF, or send it to someone. The PDF is the browser's own "save as PDF" of the page, laid out for paper by the print
// styles, so it is the report as it reads on screen. The link is a signed one that opens the report with no sign-in, and stops working
// after 30 days.
export function ReportActions({ strategyId, name }: { strategyId: string; name: string }) {
  const [sharing, setSharing] = useState(false)

  const download = () => {
    // The file is named after what is printed
    const title = document.title
    document.title = `${name} · Sandworm report`
    window.print()
    document.title = title
  }

  const share = async () => {
    setSharing(true)
    try {
      const { url } = await shareReport(strategyId)
      if (navigator.share) await navigator.share({ title: `${name} · Sandworm report`, url }).catch(() => undefined)
      else {
        await navigator.clipboard.writeText(url)
        toast.success("Link copied", { description: "Anyone with it can read this report for 30 days." })
      }
    } catch (error) {
      toast.error("Couldn't make a link", { description: errorMessage(error) })
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={download} className={buttonVariants({ intent: "outline", size: "compact" })}>
        <PiDownloadSimple size={15} aria-hidden="true" />
        Download PDF
      </button>
      <button type="button" onClick={share} disabled={sharing} className={buttonVariants({ intent: "outline", size: "compact" })}>
        <PiShareNetwork size={15} aria-hidden="true" />
        {sharing ? "Making a link…" : "Share"}
      </button>
    </div>
  )
}
