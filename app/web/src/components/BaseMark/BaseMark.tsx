import Image from "next/image"

export function BaseMark({ size = 20 }: { size?: number }) {
  return <Image src="/img/base.svg" alt="" width={size} height={size} />
}
