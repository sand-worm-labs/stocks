import { buttonVariants } from "@/components/Button/Button"
import { Switch } from "@/components/ui/switch"
import { FAUCET_URL } from "@/constants/settings"
import { shortenAddress } from "@/lib/format"
import type { Session } from "@/lib/session/types"

import { SettingRow } from "./SettingRow"
import { SettingsSection } from "./SettingsSection"

type WalletSectionProps = { session: Session; testUsdc: number }

export function WalletSection({ session: { wallet, network }, testUsdc }: WalletSectionProps) {
  return (
    <SettingsSection title="Wallet and trading" description="Paper trading uses live prices with no money.">
      <SettingRow title="Wallet" description={`${shortenAddress(wallet)} on ${network.chain}`}>
        <button
          type="button"
          className={buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-0 px-3" })}
        >
          Switch
        </button>
      </SettingRow>
      <SettingRow title="Paper trading" description="Turn off to buy with your wallet's USDC">
        <Switch aria-label="Paper trading" defaultChecked={network.mode === "paper"} />
      </SettingRow>
      <SettingRow title="Test USDC" description={`${testUsdc} USDC in your wallet`}>
        <a
          href={FAUCET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary text-sm font-medium hover:underline"
        >
          Get test USDC ↗
        </a>
      </SettingRow>
    </SettingsSection>
  )
}
