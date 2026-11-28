import { readFile } from "node:fs/promises"
import { z } from "zod"
import { addressSchema, bytes32Schema } from "../../common/hex.schema.js"
import { mirrorKeyOf } from "../../common/pool-key.js"
import { contractKinds, type Pool } from "../../common/pool.type.js"

const contractPoolSchema = z.object({
  name: z.string().min(1),
  address: addressSchema,
  kind: z.enum(contractKinds),
})

const v4PoolSchema = z
  .object({
    name: z.string().min(1),
    poolId: bytes32Schema,
    kind: z.literal("uniswap-v4"),
  })
  .transform((pool) => ({ ...pool, address: mirrorKeyOf(pool.poolId) }))

const poolSchema = z.union([contractPoolSchema, v4PoolSchema])

// The pools file lists `{ name, address, kind }`, and a v4 pool `{ name, poolId, kind: "uniswap-v4" }`
export async function loadPools(file: string): Promise<Pool[]> {
  const text = await readFile(file, "utf8")
  return z.array(poolSchema).min(1).parse(JSON.parse(text))
}
