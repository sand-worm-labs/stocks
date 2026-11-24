import { AppLink } from "@/components/AppLink/AppLink"
import { buttonVariants } from "@/components/Button/Button"
import { SandwormLogo } from "@/components/SandwormLogo/SandwormLogo"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// What a home with nothing on it says: one thing to do next, and a way round it for anyone who'd rather look first
export function StartInvesting() {
  return (
    <Card className="flex min-h-[26rem] flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="opacity-30 grayscale">
        <SandwormLogo size={72} />
      </span>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-[32px] leading-10 font-normal tracking-tight">Start investing with Sandworm</h2>
        <p className="text-ink-400 text-base">
          Say what you want. The agent researches it and builds a strategy you can check before you buy.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <AppLink
          route="newPortfolio"
          className={cn(buttonVariants({ intent: "dark", size: "compact" }), "h-11 rounded-full px-6 text-base")}
        >
          Create a strategy
        </AppLink>
        <AppLink route="markets" className="text-ink-400 hover:text-ink-100 text-sm font-medium transition-colors">
          or look around the markets first
        </AppLink>
      </div>
    </Card>
  )
}
