import { parseAbi } from "viem"

// apps/contracts/src/testnet/StockFaucet.sol
export const faucetAbi = parseAbi([
  "function stockBySymbol(bytes32 symbolHash) view returns (address)",
  "function createStock(string name, string symbol) returns (address)",
  "function createStockAt(string name, string symbol, bytes32 salt) returns (address)",
  "function ownerMint(address token, address to, uint256 amount)",
])

// apps/contracts/src/testnet/MirrorPoolFactory.sol
export const poolFactoryAbi = parseAbi([
  "function copyOf(address mainnetPool) view returns (address)",
  "function createPool(address mainnetPool, address token0, address token1, int24 tickSpacing, uint16 feeBps) returns (address)",
])

// TestUSDC and TestStock
export const tokenAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
])

// apps/contracts/src/testnet/MirrorRouter.sol, shaped like Slipstream's SwapRouter
export const routerAbi = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, int24 tickSpacing, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)",
])

// apps/contracts/src/testnet/MirrorPool.sol: a copy keeps the mainnet pool's token order
export const copyPoolAbi = parseAbi([
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function tickSpacing() view returns (int24)",
])

// What the deployment record reads from the contracts apps/contracts deployed
export const deploymentAbi = parseAbi([
  "function owner() view returns (address)",
  "function relayer() view returns (address)",
  "function router() view returns (address)",
  "function book() view returns (address)",
  "function tokenCount() view returns (uint256)",
  "function tokens(uint256) view returns (address)",
  "function poolCount() view returns (uint256)",
  "function pools(uint256) view returns (address)",
  "function mainnetPool() view returns (address)",
  "function feeBps() view returns (uint16)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
])
