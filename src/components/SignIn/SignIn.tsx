import { SandwormLogo } from "@/components/SandwormLogo/SandwormLogo"
import { env } from "env.mjs"

import { AuraPanel } from "./AuraPanel"
import { SandwormOption } from "./SandwormOption"
import { WalletOptions } from "./WalletOptions"

const LINKS = [
  { name: "Home", href: env.NEXT_PUBLIC_LANDING_URL },
  { name: "Documentation", href: env.NEXT_PUBLIC_DOCS_URL },
]

// The sign-in page, laid out as the main Sandworm app's is: the way in on one side, an aurora on the other. Home and Documentation
// sit in the corner, where someone who isn't ready to sign in can still get out.
export function SignIn() {
  return (
    <div className="relative h-dvh overflow-hidden bg-white dark:bg-[#141412]">
      <div className="grid h-full md:grid-cols-2">
        <main className="font-body relative mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center p-6">
          <nav aria-label="Site" className="text-ink-400 absolute top-6 right-6 flex gap-5 text-sm font-medium">
            {LINKS.map(({ name, href }) => (
              <a key={name} href={href} className="hover:text-ink-100 transition-colors">
                {name}
              </a>
            ))}
          </nav>

          <SandwormLogo size={40} />
          <h1 className="mt-3 text-center text-xl font-[500] xl:text-2xl">Sign in to Sandworm Stocks</h1>
          <p className="text-ink-200 mt-1.5 mb-6 max-w-xs text-center text-sm leading-5 font-medium">
            Pick or design a plan, test it on history, and let Sandworm handle the trades.
          </p>

          <div className="flex w-full flex-col gap-2">
            <SandwormOption />
            <WalletOptions />
          </div>

          <a
            href={`${env.NEXT_PUBLIC_WEB_APP_URL}/signup`}
            className="text-accent dark:text-primary mt-4 self-center text-sm font-medium hover:underline"
          >
            Sign Up to Sandworm
          </a>

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
