import { readScanConfig } from "./core/config/scan.config.js"
import { scanStocks } from "./features/scan/scan-stocks.js"
import { connectMainnet } from "./infrastructure/base-mainnet/mainnet-client.js"

const SCAN_TIMEOUT_MS = 90_000

// Finds the pools of the stocks in deployments/base-mainnet/stocks.json by reading the chain's pool-creation events, so a pool no index lists is found too
// (`pnpm scan-pools`). It writes what it finds beside each stock, as `onchain`.
async function main(): Promise<void> {
  const config = readScanConfig(process.env)
  const client = connectMainnet(config.mainnetRpcUrl, SCAN_TIMEOUT_MS)
  await scanStocks(config, client)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
