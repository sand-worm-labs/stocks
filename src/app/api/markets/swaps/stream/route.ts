import { onSwap } from "@/lib/markets/swap-feed"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
// A function can't stay open for ever: the browser's EventSource opens it again when it ends
export const maxDuration = 300

const HEARTBEAT_MS = 15_000

// Each swap in the pools of the tokenized stocks, pushed as it happens. The node is listened to here, once for every
// page, and the browser only reads this stream.
export function GET(request: Request) {
  const encoder = new TextEncoder()
  let close = () => {}

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          close()
        }
      }

      const stop = onSwap((swap) => send(`data: ${JSON.stringify(swap)}\n\n`))
      // Keeps proxies from closing a stream that is quiet
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS)

      close = () => {
        clearInterval(heartbeat)
        stop()
        request.signal.removeEventListener("abort", close)
        try {
          controller.close()
        } catch {
          // Closed already
        }
      }

      request.signal.addEventListener("abort", close)
      // Tells the page it is connected before the first swap comes
      send("retry: 3000\n: connected\n\n")
    },
    cancel() {
      close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
