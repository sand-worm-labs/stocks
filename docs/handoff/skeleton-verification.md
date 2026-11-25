# Loading skeletons: what is built, and what is still to verify

Last updated 2026-11-23. Written so that a new session, or a different model, can carry on without the conversation it came
from. Everything is in `stocks/` (the Next.js 15 app); `sandworm-web/` is the main app and is not touched by this.

## Where it stands

The skeletons are **built, type-checked, linted and tested** (186 unit tests pass). They were **checked in a real browser for
six pages** (Markets, Market summary, Holdings, Portfolios, Activity, Settings), and those swapped from skeleton to content
with no layout shift and no flicker. After that I moved some route files (see "Route structure"), which changes which skeleton
shows where, and **that restructure has not been re-checked in a browser** because a production build did not complete.

### Still open

1. **Re-run the six checked pages**, because the route restructure touched Markets, Market summary and Portfolios.
2. **Token page** (`/markets/[symbol]`, `TokenSkeleton`). Before the restructure, opening it showed the _Markets table_ skeleton
   first: the wrong one. The restructure is meant to fix that. Not yet seen to work.
3. **Portfolio detail** (`/portfolios/robotics-20`, and its Rules and Activity tabs, `PortfolioSkeleton`). Never checked.
4. **Home** (`HomeSkeleton`). Never run through the swap check.
5. **Dark mode** and **a phone width (390 px)** for all of the above. Never looked at.
6. Two small visual tweaks were applied but **not looked at**: the right-aligned status line above the Markets table
   (`MarketsSkeleton`), and the percentage column widths in `PortfoliosSkeleton`.
7. One number to explain: on Market summary, 14 `.animate-fade-up` elements were still not fully opaque after the swap
   (`maxFadedAfterSwap: 14`). Layout shift was 0. Probably in-view entrance animations that start after the 0.7 s settle window
   (harmless), but it was not confirmed. If they are present at the swap frame it is a real flicker.
8. The Markets table's column widths were never measured (the dev server hung); the Portfolios ones were.

## What was built

**Look.** `--skeleton` is `#f3f4f7` in light mode and `#2a2a2a` in dark, with `--skeleton-shine` for the passing light
(`src/styles/tailwind.css`). The `skeleton` utility there draws the shimmer with `transform` only, so it stays smooth, and it
switches off for reduced motion.

**Kit** (`src/components/Skeleton/`): `Skeleton`, `SkeletonText` (a box as tall as the real text line, so what follows does not
move), `SkeletonAvatar`, `SkeletonPill`, `SkeletonTable` (header 49 px and rows 73 px, the real heights, built from the real
table parts), `SkeletonShell` (wraps every `loading.tsx`: screen-reader status plus `SkeletonScope`), `SkeletonScope`.

**One skeleton per page**, shaped like it. Static parts are the _real_ components, not placeholders, so they do not change when
the page arrives: titles, descriptions, tabs, search boxes, `MarketTabs`, `HoldingsTabs`, `TokenTabs`, `PortfolioTabs`,
`BackLink`. Only data is a placeholder. Sizes come from measuring the real pages in the browser, not from guessing.
`HoldingsSkeleton`, `TokenSkeleton` and `PortfolioSkeleton` are client components that read the address
(`useSearchParams`, `useParams`, `usePathname`), so the tabs they show match the URL.

**Flicker fix, the part that is easy to break.** Real pages fade in with `.animate-fade-up` (starts at opacity 0). When content
replaced a skeleton that blanked it for a moment. `SkeletonScope` sets `html[data-skeleton]` while a skeleton is on screen and
for 0.7 s after (in a layout effect, so it is set in the same commit that swaps the content). The CSS rule then makes those
animations **instant** (`animation-duration: 0s; animation-delay: 0s`). It must **not** be `animation: none`: that was tried,
and when the attribute is removed the animation starts over from opacity 0, so the page fades in a second time 0.7 s after.

**Route structure.** Next shows the _outermost new_ `loading.tsx`, so a `loading.tsx` on a segment that also contains other
pages makes those pages show the wrong skeleton. So every page has its own and none is shared by sibling pages, using route
groups (they do not change URLs):

| Page                                                                     | File                                        | Skeleton                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------- |
| Home `/`                                                                 | `app/(app)/(home)/page.tsx` + `loading.tsx` | `HomeSkeleton`                                                         |
| `/markets`                                                               | `app/(app)/markets/(list)/`                 | `MarketsSkeleton`                                                      |
| `/markets/summary`                                                       | `markets/summary/loading.tsx`               | `MarketSummarySkeleton` (in `MarketsSkeleton.tsx`)                     |
| `/markets/[symbol]`                                                      | `markets/[symbol]/loading.tsx`              | `TokenSkeleton` (+ `TabSkeleton` inside the page's `Suspense`)         |
| `/portfolios`                                                            | `portfolios/(list)/`                        | `PortfoliosSkeleton`                                                   |
| `/portfolios/[id]`                                                       | `portfolios/[id]/(overview)/`               | `PortfolioSkeleton`                                                    |
| `/portfolios/[id]/rules`, `/activity`                                    | their own `loading.tsx`                     | `PortfolioSkeleton` (reads the tab from the path)                      |
| `/portfolios/[id]/report`, `buy`, `adapt`, `research`, `/portfolios/new` | their own `loading.tsx`                     | generic `PageSkeleton`                                                 |
| `/holdings`, `/activity`, `/settings`                                    | their own `loading.tsx`                     | `HoldingsSkeleton`, `ActivitySkeleton`, `SettingsSkeleton`             |
| anything else in the app                                                 | `app/(app)/loading.tsx`                     | generic `PageSkeleton` (also shown when entering the app from outside) |

Tests import the moved pages from `src/app/(app)/pages.test.tsx` (`./(home)/page`, `./markets/(list)/page`,
`./portfolios/(list)/page`). `SUMMARY_CARD_SURFACE` in `src/constants/cards.ts` is shared by the real summary cards and their
skeletons.

**By design:** changing only the query string on the page you are already on (for example `/holdings` to
`/holdings?view=stocks`) does **not** show a skeleton. Next keeps the old content until the new is ready, which is better.

## How to verify

Verification must use a **production build**. In `next dev` links are not prefetched, so the skeleton is not instant there and
this cannot be tested.

### 0. The machine is the hard part

It is an 8 GB Mac that is usually near out of memory (about 60 MB free, about 3.8 GB compressed). A production build needs about
4 GB. Before building, stop the dev server (the person's own, on port 3001: ask, do not kill it), close Chrome and other heavy
apps, and run nothing else at the same time (no `tsc`, no `vitest`, no browser). A build takes about 3 minutes with memory free
and 9 or more when it is not. If memory is short the dev server also becomes unusably slow; that is not a bug in the code.

### 1. Build

```bash
cd stocks
rm -rf .next-audit
NODE_OPTIONS=--max-old-space-size=4096 NEXT_DIST_DIR=.next-audit node node_modules/next/dist/bin/next build > /tmp/build.log 2>&1; echo "exit $?" >> /tmp/build.log
grep -nE "^exit|Failed to compile|Type error" /tmp/build.log
```

- The default heap (about 2.2 GB) runs out of memory; `package.json`'s `build` script already sets 4096 for normal use.
- **Read the `exit` line.** A background runner reports "completed" even when the build failed (this happened once).
- `next build` rewrites `tsconfig.json` (reformats it and adds `.next-audit/types/**/*.ts` to `include`). Afterwards delete that
  one `include` line; the reformatting is harmless.
- The build type-checks `.next/types`, which belongs to the dev server. After moving routes it can hold a stub for a file that
  no longer exists and fail with `Cannot find module '.../page.js'`. Delete only that stub (or stop the dev server and
  `rm -rf .next`). It is regenerated.

### 2. Serve it

```bash
NEXT_DIST_DIR=.next-audit node node_modules/next/dist/bin/next start --port 3055 &
```

Load a few pages once to warm it: the first request fetches the token list from CoinGecko, which can take many seconds. To stop
it, kill by port, **never** `pkill -f next` (that would kill the dev server): `kill $(lsof -nP -iTCP:3055 -sTCP:LISTEN -t)`.

### 3. Run the swap check

Save the script below as `skel-check.mjs` in a scratch folder with a `skel/` folder beside it, and run, for example:

```bash
node skel-check.mjs "/activity>/markets,/markets>/markets/summary,/activity>/holdings,/activity>/portfolios,/portfolios>/activity,/activity>/settings,/activity>/"
node skel-check.mjs "/activity>/markets/apple-coinbase-tokenized-stock,/portfolios>/portfolios/robotics-20"
node skel-check.mjs "/portfolios/robotics-20>/portfolios/robotics-20/rules"
DARK=1 node skel-check.mjs "<the same specs>"
W=390  node skel-check.mjs "<the same specs>"
```

Each spec is `start>target`, and the target must be linked from the start page. A token page needs a token that is in the
ticker; the ids come from CoinGecko, so pick one that is there. Playwright browsers live in `~/Library/Caches/ms-playwright`;
the version Playwright wants may differ from the one installed, so set `CHROME` to the installed
`chrome-headless-shell` if it will not start.

**Pass:** `skeletonAfterMs` under about 100 once warm (a large number on the very first navigation is the cold server, not the
skeleton), `cls` 0 to 0.01, `blankFrames` 0, `maxFadedAfterSwap` 0.

### 4. Look at the screenshots

`skel/*-skeleton-*.png` against `skel/*-final-*.png`. Check: the title and tabs are in the same place; the first screen of blocks
lines up; nothing jumps. In dark mode the skeleton must be readable against the cards. On a phone nothing may overflow 390 px,
and on the app's own pages the bottom bar must not be covered. The skeleton is allowed to be shorter than the real page (it has
fewer rows) as long as the first screen matches.

### 5. Clean up

Stop the server (by port), `rm -rf .next-audit`, and remove the `.next-audit/types` line from `tsconfig.json`.

If something does not match, the geometry lives in the one file for that page under `src/components/Skeleton/`. Measure the real
page rather than guessing: load it, and read `getBoundingClientRect()` of the blocks under `main`.

## Notes

- The first navigation after the server starts can be slow because the layout waits on the token feed; that is separate from the
  skeletons.
- The swap check script (set `W`, `DARK`, `TAG`, `BASE`, `CHROME` as needed):

```js
// Checks, in a real browser against a PRODUCTION build, that a page's skeleton swaps for its content cleanly.
//
//   node skel-check.mjs "/activity>/markets,/markets>/markets/summary"      (each is "start>target")
//   W=390 node skel-check.mjs ...      a phone         DARK=1 node skel-check.mjs ...      dark mode
//
// It starts on the first page, holds the target's content request back so the skeleton stays up, screenshots it, lets the
// content through, and reports what the swap did. Screenshots go to ./skel/.
import { createRequire } from "node:module"

const require = createRequire("/Users/si/Documents/sandworm/stocks/package.json")
const { chromium } = require("@playwright/test")

// The Chromium that is installed: Playwright may want a newer build than the one on disk. Find it with
// `ls ~/Library/Caches/ms-playwright`, and change the path if the version differs.
const executablePath =
  process.env.CHROME ??
  "/Users/si/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell"
const base = process.env.BASE ?? "http://localhost:3055"
const width = Number(process.env.W ?? 1400)
const dark = process.env.DARK === "1"
const tag = process.env.TAG ?? (dark ? "dark" : width < 700 ? "phone" : "desktop")
const browser = await chromium.launch({ executablePath })

for (const spec of process.argv[2].split(",")) {
  const [from, target] = spec.split(">")
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: dark ? "dark" : "light" })
  await context.addInitScript((isDark) => {
    // Without this the cookie banner covers the corner of every screenshot
    localStorage.setItem("sandworm_cookie_consent", "declined")
    if (isDark) localStorage.setItem("theme", "dark")
  }, dark)
  const page = await context.newPage()
  await page.goto(base + from, { waitUntil: "load", timeout: 180000 })
  // Long enough for the links on the page to have been prefetched, which is what makes the skeleton instant
  await page.waitForTimeout(2500)

  // Hold the page's own data (not the prefetch, which carries the skeleton) until released
  let release
  const gate = new Promise((resolve) => (release = resolve))
  await page.route("**/*", async (route) => {
    const headers = route.request().headers()
    if (headers["rsc"] && !headers["next-router-prefetch"] && route.request().url().includes(target.split("?")[0]))
      await gate
    await route.continue()
  })

  // What the browser does as the swap happens: every layout shift, and a sample of every frame
  await page.evaluate(() => {
    window.__shifts = []
    window.__frames = []
    new PerformanceObserver((list) =>
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) window.__shifts.push(entry.value)
      })
    ).observe({ type: "layout-shift" })
    const tick = () => {
      const main = document.querySelector("main")
      const faded = [...(main?.querySelectorAll(".animate-fade-up") ?? [])].filter(
        (el) => getComputedStyle(el).opacity !== "1"
      ).length
      window.__frames.push({
        skeleton: !!main?.querySelector(".skeleton"),
        textLength: main?.innerText.trim().length ?? 0,
        faded,
        flag: document.documentElement.dataset.skeleton ?? "",
      })
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  // A real click on a real link: a programmatic router.push does not get the prefetched skeleton
  const clickedAt = Date.now()
  const found = await page.evaluate((href) => {
    const link = document.querySelector(`a[href="${href}"]`)
    link?.click()
    return !!link
  }, target)
  if (!found) throw new Error(`no link to ${target} on ${from}: start from a page that links to it`)

  await page.waitForFunction(() => !!document.querySelector("main .skeleton"), { timeout: 30000 })
  const skeletonAfterMs = Date.now() - clickedAt
  await page.waitForTimeout(700)
  const skeletonHeight = await page.evaluate(() =>
    Math.round(document.querySelector("main").getBoundingClientRect().height)
  )
  const name = spec.replace(/[^a-z0-9]/gi, "_")
  await page.screenshot({ path: `skel/${tag}-skeleton-${name}.png` })
  await page.evaluate(() => {
    window.__shifts = []
    window.__frames = []
  })

  release()
  await page.waitForFunction(() => !document.querySelector("main .skeleton"), { timeout: 60000 })
  await page.waitForTimeout(1500)
  const result = await page.evaluate(() => {
    const frames = window.__frames
    const firstReal = frames.findIndex((frame) => !frame.skeleton)
    return {
      cls: +window.__shifts.reduce((sum, value) => sum + value, 0).toFixed(4),
      blankFrames: frames.filter((frame) => !frame.skeleton && frame.textLength === 0).length,
      maxFadedAfterSwap: Math.max(0, ...frames.slice(Math.max(firstReal, 0)).map((frame) => frame.faded)),
      flagAtSwap: frames[firstReal]?.flag,
      mainHeight: Math.round(document.querySelector("main").getBoundingClientRect().height),
    }
  })
  await page.screenshot({ path: `skel/${tag}-final-${name}.png` })
  console.log(spec.padEnd(52), JSON.stringify({ skeletonAfterMs, skeletonHeight, ...result }))
  await context.close()
}
await browser.close()
```
