import { env } from "env.mjs"

import { SandwormOption } from "./SandwormOption"
import { WalletOptions } from "./WalletOptions"

export function SignIn() {
  return (
    <main className="font-body flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center text-center">
        <span className="font-body-mono bg-primary-tint-75 text-primary dark:bg-primary/20 mb-3 rounded-full px-3 py-0.5 text-sm">
          Sandworm.Stocks
        </span>

        <h1 className="text-2xl font-medium xl:text-3xl">Sign in to Sandworm Stocks</h1>
        <p className="text-ink-200 mt-1 text-sm font-medium">Your reports run in your Sandworm workspace</p>

        <div className="mt-6 flex w-full flex-col gap-2">
          <SandwormOption />
          <WalletOptions />
        </div>

        <a
          href={`${env.NEXT_PUBLIC_WEB_APP_URL}/signup`}
          className="text-accent dark:text-primary mt-3 self-start text-sm font-medium hover:underline"
        >
          Sign Up to Sandworm
        </a>

        <p className="text-ink-200 mt-3 text-sm font-medium">
          Stock tokens are for eligible users outside the US. By continuing, you agree to our{" "}
          <a href={`${env.NEXT_PUBLIC_LANDING_URL}/terms`} className="underline">
            Terms
          </a>{" "}
          and{" "}
          <a href={`${env.NEXT_PUBLIC_LANDING_URL}/privacy`} className="underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </main>
  )
}
