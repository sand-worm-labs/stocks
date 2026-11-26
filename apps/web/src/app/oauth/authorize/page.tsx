import type { Metadata } from "next"

import { ConnectAgent } from "@/components/Connect/ConnectAgent"
import { AuraPanel } from "@/components/SignIn/AuraPanel"
import { checkAuthorizeRequest } from "@/lib/auth/oauth"

export const metadata: Metadata = { title: "Connect an agent" }

type Params = Promise<Record<string, string | string[] | undefined>>

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

// Where an agent such as Claude sends a person to connect it. Someone who isn't signed in is sent through the sign-in first and brought back
// here, as for any page of the app (middleware.ts), so this is only ever seen by a person who is.
export default async function AuthorizePage({ searchParams }: { searchParams: Params }) {
  const params = Object.fromEntries(Object.entries(await searchParams).map(([key, value]) => [key, first(value)]))
  const checked = await checkAuthorizeRequest(params)

  return (
    <div className="bg-sign-in-surface relative min-h-dvh overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        <AuraPanel />
      </div>
      {checked.ok ? (
        <ConnectAgent name={checked.client.name} request={checked.request} />
      ) : (
        <main className="font-body relative flex min-h-dvh items-center justify-center p-6">
          <div className="bg-block-surface flex max-w-sm flex-col gap-2 rounded-2xl p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.25)]">
            <h1 className="text-xl font-medium">We can't connect this agent</h1>
            <p className="text-ink-400 text-sm">{checked.error}</p>
          </div>
        </main>
      )}
    </div>
  )
}
