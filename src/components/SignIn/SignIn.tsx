import { SandwormLogo } from "@/components/SandwormLogo/SandwormLogo"
import { env } from "env.mjs"

import { AuraPanel } from "./AuraPanel"
import { WalletOptions } from "./WalletOptions"

export function SignIn() {
  return (
    <div className="bg-sign-in-surface relative h-dvh overflow-hidden">
      <div className="grid h-full md:grid-cols-2">
        <main className="font-body relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center p-6">
          <SandwormLogo size={40} />
          <h1 className="mt-3 mb-1 text-center text-2xl font-medium xl:text-3xl">Welcome to Sandworm</h1>
          <p className="text-ink-200 mb-6 max-w-xs text-center text-sm leading-5 font-medium">
            Connect a wallet to sign in. New here? We create your Sandworm account when you connect.
          </p>

          <div className="flex w-full flex-col">
            <WalletOptions />
          </div>

          <p className="text-ink-400 absolute bottom-4 max-w-[19rem] text-center text-xs font-medium">
            Stock tokens are for eligible users outside the US. By continuing, you agree to our{" "}
            <a href={`${env.NEXT_PUBLIC_LANDING_URL}/terms`} className="underline">
              Terms
            </a>{" "}
            and{" "}
            <a href={`${env.NEXT_PUBLIC_LANDING_URL}/privacy`} className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </main>

        <AuraPanel />
      </div>
    </div>
  )
}
