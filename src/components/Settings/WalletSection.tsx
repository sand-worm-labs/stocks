import { buttonVariants } from "@/components/Button/Button"
import { Switch } from "@/components/ui/switch"
import { ConnectWalletButton } from "@/components/Wallet/ConnectWalletButton"
import { UsdcBalance } from "@/components/Wallet/UsdcBalance"
import { WalletAddress } from "@/components/Wallet/WalletAddress"
import { FAUCET_URL } from "@/constants/settings"
import type { Session } from "@/lib/session/types"

import { SettingRow } from "./SettingRow"
import { SettingsSection } from "./SettingsSection"

type WalletSectionProps = { session: Session }

export function WalletSection({ session: { network } }: WalletSectionProps) {
  return (
    <SettingsSection title="Wallet and trading" description="Paper trading uses live prices with no money.">
      <SettingRow
        title="Wallet"
        description={
          <>
            <WalletAddress /> on {network.chain}
          </>
        }
      >
        <ConnectWalletButton
          className={buttonVariants({ intent: "outline", size: "sm", className: "min-h-9 min-w-0 px-3" })}
        >
          Link wallet
        </ConnectWalletButton>
      </SettingRow>
      <SettingRow title="Paper trading" description="Turn off to buy with your wallet's USDC">
        <Switch aria-label="Paper trading" defaultChecked={network.mode === "paper"} />
      </SettingRow>
      <SettingRow title="USDC in your wallet" description={<UsdcBalance />}>
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
