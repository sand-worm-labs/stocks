export type GettingStartedStep = {
  id: "joined" | "wallet" | "portfolio" | "buy"
  title: string
  description: string
  done: boolean
  current: boolean
}

type Progress = { walletConnected: boolean; hasPortfolio: boolean; hasBought: boolean }

// The first steps of a new account, in the order they are meant to be done. The one to do next is the first not done.
export function buildGettingStarted({ walletConnected, hasPortfolio, hasBought }: Progress): GettingStartedStep[] {
  const steps = [
    { id: "joined", title: "Joined Sandworm", description: "Your account is ready.", done: true },
    {
      id: "wallet",
      title: "Connect a wallet",
      description: "Link a wallet on Base. It's what you buy with.",
      done: walletConnected,
    },
    {
      id: "portfolio",
      title: "Create your first strategy",
      description: "Describe an idea and the agent researches it.",
      done: hasPortfolio,
    },
    {
      id: "buy",
      title: "Trade your first strategy",
      description: "Review the results, then trade it with USDC.",
      done: hasBought,
    },
  ] as const
  const next = steps.findIndex(({ done }) => !done)

  return steps.map((step, index) => ({ ...step, current: index === next }))
}
