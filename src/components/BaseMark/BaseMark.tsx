export function BaseMark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#0052FF" />
      <path d="M10 16a6 6 0 1 0-5.9-7.1h7.3v2.2H4.1A6 6 0 0 0 10 16Z" fill="#fff" />
    </svg>
  )
}
