import { readFile } from "node:fs/promises"
import type { Hex } from "viem"
import { z } from "zod"
import { bytes32Schema } from "../../common/hex.schema.js"

const saltsSchema = z.record(bytes32Schema)

// Optional: { "tNVDAc": "0x..." }, from apps/contracts/tools/mine-vanity.sh. No file, or one that does not parse, means no salts.
export async function readSalts(file: string): Promise<Record<string, Hex>> {
  try {
    const text = await readFile(file, "utf8")
    return saltsSchema.parse(JSON.parse(text))
  } catch {
    return {}
  }
}
