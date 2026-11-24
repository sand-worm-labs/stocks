import { buttonVariants } from "@/components/Button/Button"
import { SandwormLogo } from "@/components/SandwormLogo/SandwormLogo"
import { AUTH_PROVIDERS } from "@/lib/auth/providers"
import { cn } from "@/lib/utils"


// Signing in with the main Sandworm app. Until that is connected (see `AUTH_PROVIDERS`) the button is here and says so, rather than
// leading anywhere: it must never let someone into the app without signing in.
export function SandwormOption() {
  const { label, available } = AUTH_PROVIDERS.sandworm

  return (
    <button
      type="button"
      disabled={!available}
      title={available ? undefined : "Signing in with Sandworm is coming soon"}
      className={cn(
        buttonVariants({ intent: "outline", size: "md", className: "w-full gap-2" }),
        !available && "cursor-not-allowed opacity-60"
      )}
    >
      <SandwormLogo size={20} />
      {label}
      {!available && (
        <span className="bg-hover-bg text-ink-400 rounded-full px-2 py-0.5 text-[11px] font-medium dark:bg-white/10">
          Soon
        </span>
      )}
    </button>
  )
}
