# Onboarding reference: Glider's first-run flow

Four screenshots of another product's onboarding (Glider), kept as the reference for Sandworm Stocks' own. We take the
structure, the pacing and the craft, and adapt the content to what we build: a brief becoming a sourced proposal and an
approved portfolio of tokenized stocks, with rules the agent refuses to break. Nothing is copied as it is. The background
art (striped and dotted gradient fields) is ours to make later, so it is left out for now.

## What the flow is

A full-screen, one-question-at-a-time stepper, shown once after sign-up, then a welcome window on the first screen of the
app. Four steps, a progress bar of four segments, a way to skip at the bottom, a way back at the top.

## The shell (every step)

- **Header.** The wordmark is centred at the top. At the top left, from step 2 on, a soft round back button with a thin
  chevron. At the top right, "Not you? Sign out", very light grey, so it is there and never competes.
- **Footer.** Four short rounded segments (about 50px wide, 3px high, a few px apart): filled near-black up to the current
  step, light grey after. To their right, "Skip" in grey. All of it centred at the bottom.
- **Page.** No card, no chrome. Content sits centred in the window on a plain field, slightly above the middle.
- **Type.** A large display line (about 72px on a 2576px capture, so about 40px at 1440), regular weight, tight tracking,
  near-black. A grey support line in a lighter, larger body size. A small grey eyebrow above the first.
- **Primary action.** A black pill, about 170×70 on the capture, centred under the content. Disabled is mid grey, with the
  same shape and label.

## Step 1: "What do you want to invest in?" (01-interests.png)

- Eyebrow: "Welcome, Simon · Your account is open". Title. Support: "Pick as many as you like."
- A cloud of choice chips, centred, in rows of four: a thin line icon, then the label. Twelve of them (blue-chip stocks,
  consumer brands, bonds, crypto, gold and commodities, AI stocks, space stocks, biotech, memecoins, pre-IPO,
  investor and politician trackers, "Not sure yet"). The last is the escape hatch.
- Unselected: translucent white, a hairline border, full pill, about 70px high at capture scale (about 38px at 1440).
  Selected: solid near-black with white icon and label. One chip shows a double ring: keyboard focus.
- "Continue" below.

## Step 2: "Choose a username" (02-username.png)

- Title, then two lines of grey help text that say why it is being asked ("While we find your personalized strategies").
  The wait is used for a small task.
- One input: a wide white pill, a soft border and shadow, centred placeholder. Continue is disabled grey until it is valid.

## Step 3: "A place to start" (03-starter-strategies.png)

- Title, support line "Based on what you picked." so the choice in step 1 visibly did something.
- Three tall cards side by side, rounded about 32px, each a different soft pastel (pink, green, lavender) fading to white
  at the bottom. Top left, the figure that sells it ("+16.47%", green); top right, what it is ("1 year return", small grey).
  Under that a sparkline, green with the dips in red, running edge to edge. Then a row of circular company logos, the
  centre two larger and sharper, the outer ones smaller and softer, so it reads as a carousel. The name sits bottom left,
  two lines.
- Under the cards: a black "Continue" and a green text link "Explore more".

## Welcome window (04-welcome-modal.png)

- Shown over the first screen of the app, after the stepper. A white card, very rounded (about 36px), a soft gradient
  across its top (mint at left, blue-violet at right).
- Logo top left, a round translucent close button top right. A large title ("Welcome to Glider"), a grey line under it.
- Three rows: a rounded-square mint icon tile, a title, a grey one-line description. Then a full-width black pill, "Get
  started".

## How we adapt it

| Glider | Sandworm Stocks |
|---|---|
| What do you want to invest in? (assets) | The themes we can research and buy as tokens: categories from the market, plus "Not sure yet" |
| Choose a username | What should we call you? (a name, used in greetings and by the agent) |
| (not in Glider) | Can you trade tokenized stocks? Where you live, a wallet, USDC. Moved here from before the first portfolio, so it is asked once, after sign-up |
| A place to start (copy a strategy) | Starting briefs for the themes picked: the return of its backtest, the stocks in it, the rules it comes with. Choosing one opens the brief already written |
| Explore more | The stock picker |
| Welcome to Glider | Welcome to Sandworm Stocks: say what you want, rules it can't break, trade on Base once you approve |

The skip at the bottom does not skip the checks that make buying possible; it only skips choosing. They are asked again at the
buy step if missing.
