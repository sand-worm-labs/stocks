import Image from "next/image"

import { SandwormLogo } from "@/components/SandwormLogo/SandwormLogo"

export function AuraPanel() {
  return (
    <div className="relative hidden h-full w-full md:block">
      <div className="relative h-full min-h-dvh w-full overflow-hidden shadow-lg">
        <Image alt="" src="/img/abstract.webp" fill priority sizes="50vw" className="object-cover" aria-hidden="true" />
        <video
          className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/img/abstract.webp"
          aria-hidden="true"
        >
          <source src="/videos/aurora.webm" type="video/webm" />
          <source src="/videos/aurora.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-x-0 bottom-8 z-10 flex flex-col items-center">
          <SandwormLogo size={50} />
          <h2 className="font-body mt-3 mb-1 text-center text-3xl font-medium text-white">
            Welcome to Sandworm Stocks
          </h2>
          <div className="font-body text-aura-ink mt-2 text-center font-medium">
            <p className="text-lg md:text-base">Research an idea. Design the rules.</p>
            <p className="mt-0.5 text-lg md:text-base">Test it on history. Trade it on Base.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
