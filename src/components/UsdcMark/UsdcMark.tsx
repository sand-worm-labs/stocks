import Image from "next/image"

import { cn } from "@/lib/utils"

export function UsdcMark({ className }: { className?: string }) {
  return <Image src="/img/usdc.svg" alt="" width={32} height={32} className={cn("size-8 flex-none", className)} />
}
