export const headerIconButtonClassName =
  "text-ink-navy relative flex size-10 items-center justify-center rounded-full border border-border-secondary bg-transparent p-2 transition-colors outline-none hover:border-hover-border hover:bg-hover-bg focus-visible:ring-primary/50 focus-visible:ring-[3px] dark:border-border-tertiary dark:hover:border-border-tertiary dark:hover:bg-sidebar-hover"

export const listItemHoverClassName =
  "rounded-[10px] border border-transparent transition-[background-color,border-color] duration-200 ease-out hover:bg-hover-bg hover:border-hover-border dark:hover:bg-sidebar-hover"

export function filterPillClassName(active: boolean) {
  return [
    "flex flex-none items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors",
    active
      ? "bg-base-400 text-primary-foreground border-transparent dark:bg-white dark:text-black"
      : "border-border text-ink-400 hover:text-ink-100 hover:border-primary dark:border-border-tertiary",
  ].join(" ")
}

export const tintPillDarkClassName =
  "dark:bg-create-project-tint/[0.16] dark:border-border-tertiary dark:text-white dark:shadow-[0px_2px_2px_-1px_rgba(0,0,0,0.12),0px_4px_4px_-2px_rgba(0,0,0,0.12)]"
