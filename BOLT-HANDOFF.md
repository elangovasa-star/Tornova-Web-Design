# Tornova Backup — Web Design Handoff (for Bolt)

## What this is
This is the **Tornova public Web frontend only** — a standalone, sanitized copy
of `src/Tornova.Web` from the main Tornova product repository, prepared
specifically for visual design exploration. It is **not** the full Tornova
codebase: the backend API, checkout implementation, Windows Agent, installer,
Azure Functions, database, and deployment/infrastructure code are all
intentionally excluded and are not part of this repository.

## OUT OF SCOPE — DO NOT MODIFY
**`src/app/**`**

This is the signed-in customer dashboard. It is included in this repository
only so the project type-checks and builds as a whole — it is **not** part of
the redesign. Do not change its behavior, its appearance, or any file under
that path. If you're not sure whether something is in scope, it isn't unless
it's listed under "In scope" below.

## In scope for this redesign
- The public marketing website (`src/site/**`, all pages routed from `App.tsx`
  outside `/app`)
- Shared **public** layout/components: `src/components/SiteLayout.tsx`
  (header/nav/footer) and the parts of `src/components/ui.tsx` used by the
  public site (`Brand`, `Icon`, buttons, etc.)
- The public auth pages' visual presentation: `src/site/pages/Auth.tsx` (Sign
  In, Sign Up, Verify Email, Forgot/Reset Password) — visuals only, not the
  sign-in/sign-up logic itself
- The styles and assets those pages use: `src/styles/**`, `public/**`

## What you're being asked to do
**Visual redesign is allowed and welcome** — typography, spacing, cards,
buttons, page composition, responsive behavior, section styling, header/footer
treatment, and overall visual hierarchy can all be modernized, **within the
scope above.**

**Original content must not be added, removed, or rewritten.** Every heading,
paragraph, price, FAQ answer, and label you see is deliberately worded. Redesign
how it looks and how it's laid out — not what it says.

**Existing functionality must not be changed.** Routing, the auth flow, the
pricing UI's behavior, the FAQ's structure and deep-linking, and every other
interactive behavior in this project must keep working exactly as they do now.

**The approved Tornova logo must remain** — `public/brand/tor-logo.png` is the
real, approved brand mark. Do not redraw it, recolor it, or replace it with a
generated substitute.

**Work must stay within this temporary Web repository.** This copy is
self-contained on purpose — there is no backend to call and no other project to
touch.

**No backend or API-contract changes.** There's no backend here to change, but
to be explicit: don't invent new API calls, change request/response shapes, or
add assumptions about endpoints that don't exist in this copy.

**No new framework migration.** The existing stack is **React + Vite +
TypeScript + plain CSS** (no Tailwind, no Next.js, no component library). Please
build within that stack rather than introducing a different one.

## What you may modernize
- Typography (scale, weight, pairing)
- Spacing and rhythm
- Cards and section wrappers
- Buttons and interactive elements
- Page composition and layout
- Responsive design across breakpoints
- Section-by-section visual styling
- Header/footer visual treatment
- Overall visual hierarchy

All of this while **preserving Tornova's product meaning and behavior** — the
goal is a visual refresh of the existing site, not a different site.

## Stack and how to run it
- **React 19** + **TypeScript**, built with **Vite** — not Next.js
- **React Router v7** (`react-router-dom`, `<BrowserRouter>`) for routing
- **Plain hand-written CSS** — `src/styles/base.css` (design tokens/primitives)
  and `src/styles/layout.css` (page/section layout). No Tailwind, no CSS-in-JS
- **Vitest** + Testing Library for tests

```bash
npm install
npm run dev        # http://localhost:5173
npm run build       # production build to dist/
npm run test        # vitest
npm run typecheck   # tsc --noEmit
```

No backend is included, so pages that call the real API (Sign In/Up, the
signed-in dashboard under `src/app/`) will show their normal offline/error
states without one running — that's expected here.

## What's included
- `src/site/` — the full public marketing site (Home, Pricing, FAQ, Download,
  Roadmap, Personal, Organization, Security, Pioneer, Support, Trials, Referral,
  Contact, Feedback) and `src/site/pages/Auth.tsx` (Sign In/Up/Verify/Reset)
- `src/app/` — the signed-in customer dashboard, included for build
  completeness only. **Out of scope — see above. Do not modify.**
- `src/components/` — shared UI (`SiteLayout.tsx`: header/nav/footer used by
  every public page; `ui.tsx`: Brand, Icon, Notice, Dialog, etc.)
- `src/styles/` — the complete design system
- `public/brand/` — the approved assets: `tor-logo.png` (logo),
  `hero-illustration.png` (approved homepage hero artwork), `roadmap.png`
  (approved product roadmap infographic)
- Existing tests: `src/site.test.tsx`, `src/dashboard13b.test.tsx`, and the
  `src/lib/*.test.ts` files

## Locked content (preserve exactly)
- Hero: "One Backup. Complete Confidence.", "Simple for Individuals. Powerful
  for Organizations.", "Cloud Backup Starting at Just $2.49/Month.", "With the
  freedom of monthly payments. No annual commitment.", "Hosted in the US.
  Accessible Worldwide."
- Header nav order: Download, Features, Personal, Organization, Trials,
  Pricing, FAQ, Security, Pioneer, Support (Sign Up always the rightmost/
  strongest call to action)
- Roadmap: Version 1–7 titles and summaries, and **no dates, years, quarters,
  or delivery commitments anywhere**
- All FAQ question/answer text (`src/site/content/faq.ts`)

## How your output will be used
Whatever comes back from this exercise will be treated as a **visual
reference** — the design decisions get hand-applied back into the real Tornova
project's existing React Router + plain CSS setup, not merged in directly. That
keeps routing, tests, and real API-driven behavior intact on the production
side.
