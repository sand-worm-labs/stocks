import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { z } from "zod"

import { ApiError } from "./api"

const text = (value: string, isError = false) => ({ isError, content: [{ type: "text" as const, text: value }] })

// What the app refused is said as it was, so the agent can act on it. Anything else is ours, and is not shown.
function failure(error: unknown) {
  if (error instanceof ApiError) return text(error.message, true)
  console.error(error)
  return text("Something went wrong on our side", true)
}

// One tool: what it is for, what it takes, and what it does. What it hands back is read as JSON, and any refusal as a plain sentence, the same
// way for every tool, so a tool is only ever the part that is its own.
export function addTool<Shape extends z.ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  shape: Shape,
  run: (input: z.infer<z.ZodObject<Shape>>) => Promise<unknown>
) {
  const callback = async (input: z.infer<z.ZodObject<Shape>>) => {
    try {
      return text(JSON.stringify(await run(input), null, 2))
    } catch (error) {
      return failure(error)
    }
  }
  // The SDK types the callback's input by a conditional type over the shape, which can't be worked out for a shape that is a parameter. At
  // each call the shape is known, and `input` is what it describes, which is what `run` is typed to take.
  server.registerTool(name, { description, inputSchema: shape }, callback as unknown as ToolCallback<Shape>)
}

export const path = (id: string) => encodeURIComponent(id)
