export const ROW =
  "hover:bg-hover-bg focus-visible:bg-hover-bg flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors outline-none disabled:opacity-40 disabled:hover:bg-transparent"

export const MATCHES = [
  { match: "all" as const, label: "All must hold", description: "Every condition has to be true." },
  { match: "any" as const, label: "Any one will do", description: "One true condition is enough." },
]
