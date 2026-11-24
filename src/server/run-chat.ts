import { createChatServer } from "./chat-server"

const port = Number(process.env.CHAT_PORT ?? 3002)
createChatServer(port)
console.log(`Chat is listening on ws://localhost:${port}`)
