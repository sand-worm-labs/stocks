"use client"

import { useState } from "react"
import { PiCoins, PiEye, PiPencilSimple, PiShieldCheck } from "react-icons/pi"

import { buttonVariants } from "@/components/Button/Button"
import { SandwormLogo } from "@/components/SandwormLogo/SandwormLogo"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type ConnectRequest = { clientId: string; redirectUri: string; state?: string; codeChallenge: string }

type ConnectAgentProps = {
  // What the agent calls itself, as it said when it registered
  name: string
  request: ConnectRequest
}

// What allowing an agent means, in the app's own words: it acts as the person, with the same limits the app has
const CAN: { icon: typeof PiEye; text: string }[] = [
  { icon: PiEye, text: "See your strategies, reports, activity and the markets" },
  { icon: PiPencilSimple, text: "Make strategies, change their rules, confirm them and hand back research" },
  { icon: PiCoins, text: "Start paper trading, put paper money in and sell" },
]

const answer = (request: ConnectRequest, allow: boolean) =>
  fetch("/api/oauth/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: request.clientId,
      redirect_uri: request.redirectUri,
      state: request.state,
      code_challenge: request.codeChallenge,
      allow,
    }),
  })

// The window an agent sends a person to when they connect it: who is asking, what it can do, and a yes or no. It is the same dialog the app
// uses everywhere, over the same aurora as the sign-in, so connecting an agent feels like part of Sandworm Stocks and not a stranger's page.
export function ConnectAgent({ name, request }: ConnectAgentProps) {
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string>()
  const host = new URL(request.redirectUri).host

  async function decide(allow: boolean) {
    setIsBusy(true)
    setError(undefined)
    const response = await answer(request, allow).catch(() => undefined)
    const body = (await response?.json().catch(() => undefined)) as { redirect?: string; error?: string } | undefined
    if (response?.ok && body?.redirect) {
      window.location.assign(body.redirect)
      return
    }
    setIsBusy(false)
    setError(response?.status === 401 ? "You were signed out. Reload this page to sign in again." : (body?.error ?? "That didn't work. Try again"))
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-[440px] items-stretch gap-5 sm:p-7" onEscapeKeyDown={(event) => event.preventDefault()} onInteractOutside={(event) => event.preventDefault()}>
        <div className="flex flex-col items-center gap-3 text-center">
          <SandwormLogo size={40} />
          <DialogTitle className="text-2xl">Connect {name} to Sandworm Stocks</DialogTitle>
          <DialogDescription className="max-w-xs leading-5">
            {name} will act for you in Sandworm Stocks, with the same limits you have in the app.
          </DialogDescription>
        </div>

        <ul className="border-border-secondary flex flex-col gap-3 rounded-xl border p-4">
          {CAN.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm leading-5">
              <span aria-hidden="true" className="bg-inputBg text-ink-200 flex size-7 flex-none items-center justify-center rounded-lg">
                <Icon size={16} />
              </span>
              {text}
            </li>
          ))}
          <li className="flex items-start gap-3 text-sm leading-5">
            <span aria-hidden="true" className="bg-inputBg text-ink-200 flex size-7 flex-none items-center justify-center rounded-lg">
              <PiShieldCheck size={16} />
            </span>
            <span>
              It can't spend your wallet's money. Starting a wallet trade still needs a signature from you, made in the app.
            </span>
          </li>
        </ul>

        <p className="text-ink-400 text-center text-xs">After you choose, you'll go back to {host}.</p>

        {error && (
          <p role="alert" className="text-center text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => decide(false)}
            className={cn(buttonVariants({ intent: "outline" }), "h-11 disabled:opacity-60")}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => decide(true)}
            className={cn(buttonVariants({ intent: "primary" }), "h-11 disabled:opacity-60")}
          >
            {isBusy ? "Connecting…" : "Allow"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
