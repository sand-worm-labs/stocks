export const CARD_WIDTH = 416

export const MARGIN = 16

export const GAP = 14

export const PAD = 6

export const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"

export const MOVE = 520

export const LEAVE = 220

// Where the thing a step points at is, kept up to date every frame while it is shown so a scroll, a resize or a page that settles
// late never leaves the spotlight behind. The same name can be in the header and on a phone's tab bar; the one that is there wins.
// The first time it is found the page is scrolled to put it just under the header, so the card has room under it; a thing that stays
// put as the page moves (a sticky bar, the header) isn't chased.
export const HEADER = 120

export const ROOM = 320

export const BUTTON =
  "inline-flex h-9 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-[opacity,transform,background-color,color] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"

// Where the tour is up to, kept for the tab, so a reload in the middle of it carries on rather than starting again
export const PROGRESS_KEY = "sw_tour_step"

// How long to wait for a page to open before showing its step anyway, so a page that can't be reached never leaves the tour stuck
export const OPEN_TIMEOUT = 25_000

export const TOUR_EVENT = "sandworm:tour"
