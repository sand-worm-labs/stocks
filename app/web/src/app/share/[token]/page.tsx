import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ReportDocument } from "@/components/Report/ReportDocument"
import { readReportShare } from "@/lib/auth/token"
import { getStore } from "@/lib/store"

export const metadata: Metadata = { title: "Strategy report", robots: { index: false } }

// A report opened from a shared link: read-only, with no sign-in, no buttons, and nothing of the person's account around it. The link is
// signed and expires, so it opens exactly the report it was made for and for only a while.
export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const id = await readReportShare(token)
  const record = id ? await getStore().get(id) : undefined
  const result = record?.research?.result
  if (!record || !result) notFound()

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 md:px-8">
      <ReportDocument
        id={record.id}
        name={record.name}
        brief={record.brief}
        result={result}
        amount={record.budget}
        preparedAt={record.events.find(({ kind }) => kind === "ready")?.at ?? record.updatedAt}
      />
    </main>
  )
}
