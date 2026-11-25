import { useId } from "react"

import { FANCY_ICONS, type FancyIconName } from "@/constants/fancy-icons"
import { cn } from "@/lib/utils"

type FancyIconProps = { name: FancyIconName; size?: number; className?: string }

export function FancyIcon({ name, size = 41, className }: FancyIconProps) {
  const { body: Body, lines: Lines } = FANCY_ICONS[name]
  // Every icon on a page needs ids of its own, or one icon's gradients would paint another's. The colons React puts in
  // an id are left out, as they do not belong in a url(#...)
  const id = useId().replace(/:/g, "")
  const ring = `${id}-ring`
  const tile = `${id}-tile`
  const rim = `${id}-rim`
  const tileShadow = `${id}-tile-shadow`
  const glyphShadow = `${id}-glyph-shadow`

  return (
    <svg
      data-slot="fancy-icon"
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 41 41"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("flex-none", className)}
    >
      <rect x="0.5" y="0.5" width="40" height="40" rx="12" stroke={`url(#${ring})`} />
      <g filter={`url(#${tileShadow})`}>
        <rect x="6.5" y="6.5" width="28" height="28" rx="8.4" fill={`url(#${tile})`} />
        <rect x="6.5" y="6.5" width="28" height="28" rx="8.4" stroke={`url(#${rim})`} strokeWidth="0.7" />
      </g>
      <g filter={`url(#${glyphShadow})`}>
        <Body x={10.5} y={10.5} size={20} color="#7D39D0" stroke="#391466" strokeWidth={6} strokeLinejoin="round" />
        <Lines x={10.5} y={10.5} size={20} className="[&_path]:fill-white [&_path[opacity]]:hidden" />
      </g>
      <defs>
        <filter
          id={tileShadow}
          x="6.15"
          y="6.15"
          width="28.7"
          height="29.7"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="1.5" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.0863131 0 0 0 0 0.0287251 0 0 0 0 0.0287251 0 0 0 0.55 0" />
          <feBlend mode="normal" in2="shape" result="innerShadow" />
        </filter>
        <filter
          id={glyphShadow}
          x="8"
          y="8"
          width="25"
          height="26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dy="2.47296" />
          <feGaussianBlur stdDeviation="1.23648" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend mode="normal" in2="shape" result="innerShadow" />
        </filter>
        <linearGradient id={ring} x1="-0.257576" y1="7.40253" x2="43.9067" y2="14.0656" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6368FF" />
          <stop offset="0.153846" stopColor="#CBECFF" />
          <stop offset="0.25" stopColor="#7BFF42" />
          <stop offset="0.427885" stopColor="#2DB2FF" />
          <stop offset="0.610577" stopColor="#FF0000" />
          <stop offset="0.817308" stopColor="#DED757" />
          <stop offset="1" stopColor="#FF00E1" />
        </linearGradient>
        <linearGradient id={tile} x1="20.5" y1="6.5" x2="20.5" y2="34.5" gradientUnits="userSpaceOnUse">
          <stop offset="0.0364778" stopColor="#523E76" />
          <stop offset="0.283403" stopColor="#1A071C" />
        </linearGradient>
        <linearGradient id={rim} x1="20.5" y1="6.5" x2="20.5" y2="34.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0D0D1F" />
          <stop offset="1" stopColor="#111223" />
        </linearGradient>
      </defs>
    </svg>
  )
}
