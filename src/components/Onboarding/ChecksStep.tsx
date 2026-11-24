"use client"

import { PiInfo } from "react-icons/pi"

import { RegionCheckRow } from "@/components/Region/RegionCheckRow"
import { Tooltip } from "@/components/Tooltip/Tooltip"
import { Card } from "@/components/ui/card"
import { UsdcCheckRow } from "@/components/Wallet/UsdcCheckRow"
import { WalletCheckRow } from "@/components/Wallet/WalletCheckRow"

import { ContinueButton } from "./ContinueButton"
import { StepHeading } from "./StepHeading"

type ChecksStepProps = { region: string; chain: string; onContinue: () => void }

// Whether they can trade tokenized stocks: where they live, a wallet, and USDC to buy with. Asked here, once, after
// sign-up, and not before every portfolio. None of it blocks: without it they can still use paper trading.
export function ChecksStep({ region, chain, onContinue }: ChecksStepProps) {
  return (
    <div className="flex w-full max-w-4xl flex-col items-center gap-6">
      <StepHeading
        title={
          <span className="inline-flex items-center gap-3">
            Can you trade tokenized stocks?
            <Tooltip title="Three quick checks, so you don't test an idea you can't trade." side="top" wide>
              <button
                type="button"
                aria-label="Why these checks"
                className="text-ink-300 hover:text-ink-100 transition-colors"
              >
                <PiInfo size={20} aria-hidden="true" />
              </button>
            </Tooltip>
          </span>
        }
      />
      <Card className="w-full max-w-xl">
        <RegionCheckRow region={region} />
        <WalletCheckRow chain={chain} />
        <UsdcCheckRow />
      </Card>
      <div className="flex flex-col items-center gap-3">
        <ContinueButton onClick={onContinue} />
        <p className="text-ink-400 text-center text-sm">
          Paper trading uses live prices with no money. You can switch to your wallet at the buy step.
        </p>
      </div>
    </div>
  )
}
