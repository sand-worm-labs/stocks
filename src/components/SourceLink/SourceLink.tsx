import type { Source } from "@/types/markets"

export function SourceLink({ name, url, title }: Source) {
  return (
    <a
      href={url}
      title={title}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-ink-100 underline underline-offset-2"
    >
      {name}
    </a>
  )
}
