export const headerIconButtonClassName =
  "text-ink-navy relative flex size-10 items-center justify-center rounded-full border border-border-secondary bg-transparent p-2 transition-colors outline-none hover:border-hover-border hover:bg-hover-bg focus-visible:ring-primary/50 focus-visible:ring-[3px] dark:border-border-tertiary dark:hover:border-border-tertiary dark:hover:bg-sidebar-hover"

// A row in a list that lights up under the pointer, the way the web app's menu items do: a soft fill, a border that
// appears, and rounded corners, eased in so it never snaps
export const listItemHoverClassName =
  "rounded-[10px] border border-transparent transition-[background-color,border-color] duration-200 ease-out hover:bg-hover-bg hover:border-hover-border dark:hover:bg-sidebar-hover"

// A filter pill, the way the markets categories draw it: the pill picked is solid, the others outlined and quiet
export function filterPillClassName(active: boolean) {
  return [
    "flex flex-none items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors",
    active
      ? "bg-base-400 text-primary-foreground border-transparent dark:bg-white dark:text-black"
      : "border-border text-ink-400 hover:text-ink-100 hover:border-primary dark:border-border-tertiary",
  ].join(" ")
}
