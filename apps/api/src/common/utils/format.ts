const amount = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
})
const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 })
const signedPercent = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
})
export const formatAmount = (value: number) => amount.format(value)
export const formatCompactUsd = (value: number) => compactUsd.format(value)
export const formatPercent = (value: number, { signed = false } = {}) =>
  (signed ? signedPercent : percent).format(value)
