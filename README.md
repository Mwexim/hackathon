# KBC Life Moments — proof of concept

Built for the KBC challenge at the Tectonic Hackathon. A KBC-inspired mobile banking app with a
**life-moment engine** behind it:

```
customer data → signals → explainable probability → consent-aware question → confirm / dismiss → relevant actions
```

The system detects a **possibility**, never a fact. It asks ("Have you recently moved?"), it never
assumes. After the customer confirms, actions that **protect an existing contract** come first
(e.g. "Update the address on your home insurance"); commercial offers only appear if the customer
consented to them.

All data is synthetic. Counterparties are pseudonymised IDs.

## Run it

```bash
npm install
cp .env.example .env.local   # optional in development
npm run dev
```

Open http://localhost:3000. State is in memory and resets when the server restarts.

`SESSION_SECRET` is required in production (min. 32 characters). In development a random
per-process secret is generated when it is missing.

## Demo logins

| Login | Consent | What you should see |
|---|---|---|
| Benjamin | tailored | "Have you recently moved?" → update home-insurance address + 2 offers |
| Sarah | basic | "Has your family grown?" → add child to family insurance + 1 offer |
| Thomas | none | "Are you travelling more often?" → "You're already covered", no sale |
| Emma | tailored | No life-event question (near-misses only) |
| KBC employee | – | Detection debug view with all scores (disabled in production) |

## How detection works

`lib/detection` — explainable likelihood-ratio scoring, fully offline (no ML, no LLM):

```
odds = prior / (1 - prior) × Π LR(strongest present signal per group)
confidence = odds / (1 + odds)
```

- Only the last 90 days count (the demo "today" is fixed at `DEMO_TODAY` in `config.ts`).
- Correlated signals share a group; only the strongest per group counts.
- `sensitiveFilter.ts` removes `hospital` / `pharmacy` transactions **before** signal extraction.
- ≥ 0.85 → direct question, 0.50–0.85 → softer question, < 0.50 → nothing.
- All priors, LRs and thresholds live in `lib/detection/config.ts` (team estimates).
  Frequent-traveller LRs were tuned from 6/3/3 to 8/5/4 to reach the 0.85 target.

Current scores: Benjamin moved_house 0.998 · Sarah new_baby 0.973 · Thomas frequent_traveller 0.894 ·
Emma max 0.039.

## API

All endpoints derive the customer from the signed session cookie. No endpoint accepts a customer
id except the demo login.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/session` | who is logged in |
| POST | `/api/session` | body `{ customerId }` — demo login (only allowed ids) |
| DELETE | `/api/session` | logout |
| GET | `/api/me/customer` | |
| GET | `/api/me/accounts` | |
| GET | `/api/me/transactions?limit=20` | limit 1–200 |
| GET | `/api/me/notifications` | |
| POST | `/api/notifications/:id/read` | 404 if not yours |
| GET | `/api/me/events` | |
| POST | `/api/events/:eventId/confirm` | 404 if not yours, 409 if not `detected` |
| POST | `/api/events/:eventId/dismiss` | 404 if not yours, 409 if not `detected` |
| GET | `/api/me/recommendations` | confirmed events only, consent-filtered |
| GET | `/api/debug/events` | employee session only; 404 in production |

The frontend only talks to the API through `lib/client/api.ts`.

## Security notes

- Session cookie: HMAC-SHA256 signed, `httpOnly`, `sameSite=lax`, `secure` in production, 8h expiry.
- Ownership is enforced in the data layer (`lib/data/store.ts`), not only in routes.
- State-changing requests reject a cross-site `Origin` header.
- All input validated with zod; errors are generic.
- The employee login and debug endpoint/page are disabled when `NODE_ENV=production`.
- No secrets in the repo; `.env*.local` is git-ignored.

## Project layout / ownership

```
app/login, app/(app)/{dashboard,accounts,transactions}   Person 2 (+ components/ layout & nav)
app/(app)/{notifications,recommendations,apply/[id]}      Person 3
app/api, lib/{data,detection,recommendations,auth,api}    Person 1
lib/types.ts                                              SHARED CONTRACT — change only after team agreement
lib/client/api.ts                                         the only place the frontend calls the API
app/employee                                              employee debug view (dev only)
```

## Unfinished / next steps

- Screens are working placeholders — Person 2/3 to design them properly.
- Apply screen is fake (nothing is submitted).
- No persistence: confirm/dismiss state resets on restart.
- Optional: friendlier message wording via Gemini behind an env variable, with the templates in
  `lib/detection/messages.ts` as fallback.
- Muted topics and a "low" proactivity level are respected by the detector, but there is no UI to
  change consent settings yet.
