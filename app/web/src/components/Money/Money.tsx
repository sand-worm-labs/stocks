import { UsdcMark } from "@/components/UsdcMark/UsdcMark"
import { formatAmount, formatCompactAmount, formatSignedAmount } from "@/lib/format"
import { cn } from "@/lib/utils"

type MoneyProps = {
  value: number
  signed?: boolean
  coin?: boolean
  unit?: boolean
  compact?: boolean
  className?: string
}

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
