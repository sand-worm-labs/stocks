import { SWAP_FEE_RATE } from "@/constants/trade"

// What a purchase of `spend` comes to with the swap fee. The browser and the server both work the limit out with this, so the words a
// wallet signs are the same on both sides to the last digit.
export const withFee = (spend: number) => spend * (1 + SWAP_FEE_RATE)
