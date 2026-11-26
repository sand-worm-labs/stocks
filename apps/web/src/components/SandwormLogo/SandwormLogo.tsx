import Image from "next/image"

export function SandwormLogo({ size = 40 }: { size?: number }) {
  return <Image src="/logo.svg" alt="" width={size} height={size} priority />
}
