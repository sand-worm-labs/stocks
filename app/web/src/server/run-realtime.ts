import { createRealtimeServer } from "./realtime-server"

const port = Number(process.env.REALTIME_PORT ?? 3002)
createRealtimeServer(port)
console.log(`Chat and the live market are listening on ws://localhost:${port}`)
