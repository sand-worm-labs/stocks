// The lead words every rule starts with, in the list of rules and on the board, so they look the same in both
export const LEADS = {
  If: { className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  Then: { className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  Otherwise: { className: "bg-red-500/15 text-red-700 dark:text-red-400" },
  Never: { className: "bg-red-500/15 text-red-700 dark:text-red-400" },
  Only: { className: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  Always: { className: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
} as const
