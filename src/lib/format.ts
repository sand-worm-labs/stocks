const amount = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
})
const compactAmount = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 })
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 })
const signedPercent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
})

const signedAmount = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
})
const decimal = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 })

export const formatSignedAmount = (value: number) => signedAmount.format(value)
export const formatDecimal = (value: number) => decimal.format(value)
export const formatAmount = (value: number) => amount.format(value)
export const formatUsd = (value: number) => usd.format(value)
export const formatCompactAmount = (value: number) => compactAmount.format(value)
export const formatCompactUsd = (value: number) => compactUsd.format(value)
export const formatPercent = (value: number, { signed = false } = {}) =>
  (signed ? signedPercent : percent).format(value)

export const pluralize = (count: number, noun: string) => `${count} ${count === 1 ? noun : noun.replace(/([^aeiou])y$/, "$1ie") + "s"}`

export const shortenAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`
