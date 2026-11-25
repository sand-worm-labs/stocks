# Sign-in and first-run flow

Written 2026-11-24. The app behaves the way production will: nothing opens without signing in.

## The flow

1. **Signed out, any page** goes to `/signin?next=<where they were going>`. Only `/signin` is open (`src/middleware.ts`). There is no list of
   protected pages to keep up to date. It is on by default; `AUTH_REQUIRED=false` switches it off for working without a wallet
   (the Playwright tests set it).
2. **Signing in** with a provider ends in our own session cookie (`sw_session`). Nothing downstream knows which provider was used.
3. **First time for that account** goes to `/onboarding` (the stepper: interests, name, checks, start), whatever page they asked for.
   Finishing it sets `sw_onboarded` to the **account id**, so a new account on a browser someone else used still gets the first run.
   The guided tour (`src/components/Tour`, 6 steps) then shows once on the first page; Skip, Esc or the last button ends it, and Settings has "Replay".
4. **Been through it** goes to where they were going (default `/strategies`). The sign-in page redirects away from anyone signed in.

## Signing in and the account (`src/lib/auth/identity.ts`, `account.ts`)

There is one way in: **connect a wallet** (Dynamic: a wallet, or an email that comes with one). Needs `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`
and `AUTH_SECRET`. "Continue with Sandworm" was removed. The browser posts Dynamic's token to `/api/auth/session`, which checks it
against Dynamic's public keys, then makes the session cookie. Stocks keeps no account of its own: the account is the Sandworm one (below), and the web app has no database.

**The Sandworm account.** With `SANDWORM_API_URL` set (the main app's API, with its `/api`), the session route first sends Dynamic's token to
the main app's `POST /auth/dynamic/login` (`apps/api/src/features/auth/dynamic`, no password). It checks the token itself, finds or creates
the Sandworm user for that wallet or email (the same path as Google and GitHub sign-in), adds the verified wallets to their settings,
and answers with the user. **That user's id is the account id here**, so strategies belong to the Sandworm account. A new person gets their account made on the spot, with no invite (the main app opens sign-up for this route only). Without
`SANDWORM_API_URL` it keeps to Dynamic's own id, for working locally. The main app needs `DYNAMIC_PUBLIC_KEY` (the environment public key, PEM, from the Dynamic dashboard) in its `.env`.

## Known limits

- The profile (name, interests, "first run done") lives in browser cookies until accounts are stored on a server. The same account
  on a second browser goes through the first run again.
- A wallet sign-in was **not exercised end to end** in a browser here (it needs a real wallet). The redirects, the cookie checks and
  the session route were exercised against the running server with a signed cookie.
- Signing out of Dynamic clears our cookie (`onLogout`). The session otherwise lasts 7 days.

## The sign-in page (2026-11-24)

Laid out as the main Sandworm app's is (`sandworm-web/apps/web/src/app/(onboarding)/layout.tsx`): the way in on the left, an aurora on the
right (`AuraPanel`, assets in `public/img/abstract.webp` and `public/videos/aurora.*`, hidden on a phone). No site header and no Launch App
button; Home and Documentation are in the top corner of the form side. The wallet button spins and cannot be pressed from the click until
the page has changed (`Wallet.connecting`, published by `DynamicSdk`), and is free again if the wallet window is closed or the sign-in fails.
