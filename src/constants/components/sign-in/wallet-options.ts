import { buttonVariants } from "@/components/Button/Button"
import { cn } from "@/lib/utils"

// The same shape as the sign-in buttons on the main Sandworm app: squarer than the app's pills
export const BUTTON = cn(buttonVariants({ intent: "outline", size: "md", className: "w-full gap-2" }), "rounded-2xl")
