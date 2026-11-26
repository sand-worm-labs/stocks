import type { Metadata } from "next"
import Link from "next/link"

import { PageHeader } from "@/components/PageHeader/PageHeader"
import { TrashList } from "@/components/Strategy/TrashList"

export const metadata: Metadata = { title: "Trash" }

export default function TrashPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon="portfolio" title="Trash" actions={<Link href="/strategies" className="text-ink-400 hover:text-ink-100 text-sm">Back to my strategies</Link>} />
      <p className="text-ink-400 max-w-2xl text-sm leading-6">
        Strategies you delete wait here for 30 days, with their chat and activity, and can be put back. After that they are deleted for good.
      </p>
      <TrashList />
    </div>
  )
}
