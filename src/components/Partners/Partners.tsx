import Image from "next/image"

export function Partners() {
  return (
    <footer className="font-body flex flex-col items-center gap-4 px-4 py-10">
      <p className="text-ink-400 text-sm font-medium">Trusted by teams at</p>
      <div className="flex items-center gap-8">
        <Image src="/img/base-white.svg" alt="Base" width={56} height={24} className="object-contain" />
        <Image
          src="/img/icn-logo-black.svg"
          alt="Impossible Cloud Network"
          width={98}
          height={24}
          className="object-contain dark:invert"
        />
      </div>
    </footer>
  )
}
