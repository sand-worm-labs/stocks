import { buttonVariants } from "@/components/Button/Button"
import { cn } from "@/lib/utils"

export const CONNECT = cn(buttonVariants({ intent: "dark", size: "compact" }), "hidden lg:inline-flex")
