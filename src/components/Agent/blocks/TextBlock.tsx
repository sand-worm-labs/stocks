// The text is streamed in by the agent's motion, from `data-stream`, so what is here is the whole of it for anyone
// the motion doesn't run for
export function TextBlock({ text }: { text: string }) {
  return (
    <p data-block data-stream={text} className="text-sm leading-6">
      {text}
    </p>
  )
}
