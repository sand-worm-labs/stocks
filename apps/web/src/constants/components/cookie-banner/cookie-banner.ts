import { buttonVariants } from "@/components/Button/Button"

// The same key as the main app's, so a browser that has answered there has answered here too, where they share a site
export const CONSENT_KEY = "sandworm_cookie_consent"

export const SHOW_AFTER_MS = 600

// As long as the exit animation
export const LEAVE_MS = 300

export const ACCEPT = buttonVariants({ intent: "dark", size: "compact", className: "w-full text-[13px] font-medium" })

export const DECLINE = buttonVariants({
  intent: "outline",
  size: "compact",
  className: "w-full text-[13px] font-medium",
})
