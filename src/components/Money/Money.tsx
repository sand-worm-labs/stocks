import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import { formatAmount, formatCompactAmount, formatSignedAmount } from "@/lib/format"
import { cn } from "@/lib/utils"

type MoneyProps = {
  value: number
  // With a plus or a minus in front
  signed?: boolean
  // The USDC coin before it, which says what money it is
  coin?: boolean
  // The word as well, where the coin alone would not be clear
  unit?: boolean
  // 10.09M, for a figure too big to write out
  compact?: boolean
  className?: string
}

// An amount of USDC written as money, the same wherever it is: the USDC coin, the whole part, and the cents small and
// quiet. It takes the colour and size of what it sits in.
export function Money({ value, signed, coin = true, unit = false, compact, className }: MoneyProps) {
  const written = compact ? formatCompactAmount(value) : signed ? formatSignedAmount(value) : formatAmount(value)
  const sign = /^[+−-]/.test(written) ? written.slice(0, 1) : ""
  const digits = sign ? written.slice(1) : written
  const point = digits.lastIndexOf(".")
  const whole = point < 0 ? digits : digits.slice(0, point)
  const cents = point < 0 ? "" : digits.slice(point)

  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap tabular-nums", className)}>
      {coin && <UsdcMark className="size-[1.1em] flex-none" />}
      <span>
        {sign}
        {whole}
        <span className="text-[0.78em] opacity-60">{cents}</span>
      </span>
      {unit && <span className="text-[0.68em] font-medium tracking-wide opacity-60">USDC</span>}
    </span>
  )
}
