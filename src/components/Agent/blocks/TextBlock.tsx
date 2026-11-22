// The text is streamed in by the agent's motion, from `data-stream`, so what is here is the whole of it for anyone
// the motion doesn't run for
export function TextBlock({ text }: { text: string }) {
  return (
    <p
      data-block
      data-stream={text}
      className="bg-block-surface border-border-secondary dark:border-border-tertiary w-fit max-w-full rounded-2xl rounded-bl-sm border px-4 py-2.5 text-[13px] leading-relaxed [overflow-wrap:anywhere]"
    >
      {text}
    </p>
  )
}
