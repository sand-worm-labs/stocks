import type { ReactNode } from "react"

type StepHeadingProps = { eyebrow?: string; title: ReactNode; support?: ReactNode }

// What a step asks: a small line above, the question large, and a grey line saying why or how
export function StepHeading({ eyebrow, title, support }: StepHeadingProps) {
  return (
    <div className="flex max-w-4xl flex-col items-center gap-2 text-center">
      {eyebrow && <p className="text-ink-400 text-[15px]">{eyebrow}</p>}
      <h1 className="text-[30px] leading-[36px] font-normal tracking-tight text-balance md:text-[41px] md:leading-[48px]">
        {title}
      </h1>
      {support && <p className="text-ink-400 max-w-md text-lg">{support}</p>}
    </div>
  )
}
