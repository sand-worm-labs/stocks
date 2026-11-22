"use client"

import { createContext, useContext } from "react"

const WalletEnabledContext = createContext(false)

export const WalletEnabled = WalletEnabledContext.Provider

// Whether wallets are set up. They need Dynamic's environment ID, and without one the rest of the app still works.
export const useWalletEnabled = () => useContext(WalletEnabledContext)
