import { TokenAvatar } from "@/components/Markets/TokenAvatar"
import { StartResearchButton } from "@/components/StartResearchButton/StartResearchButton"
import { Badge } from "@/components/ui/badge"
import type { BaseToken } from "@/lib/markets/tokens"

import { LiveChanges } from "./LiveChanges"
import { LivePrice } from "./LivePrice"

type TokenHeaderProps = { token: BaseToken; researchId: string }

export function TokenHeader({ token, researchId }: TokenHeaderProps) {
  const { image, symbol, company, issuer, price, address } = token

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <TokenAvatar image={image} symbol={symbol} className="size-14 text-base" />
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-medium md:text-[32px] md:leading-10">{company}</h1>
            <Badge className="font-body-mono rounded-md">{symbol}</Badge>
            <Badge tone="info">{issuer}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <LivePrice address={address} initial={price} />
            <LiveChanges token={token} />
          </div>
        </div>
      </div>
      <StartResearchButton portfolioId={researchId} />
    </div>
  )
}
