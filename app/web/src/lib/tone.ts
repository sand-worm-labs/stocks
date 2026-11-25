import type { Tone } from "@/constants/tone"

export const changeTone = (change: number): Tone => (change > 0 ? "positive" : change < 0 ? "negative" : "neutral")
