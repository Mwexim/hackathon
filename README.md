# Life Moments — KBC challenge, Tectonic Hackathon

## What it is

A KBC-inspired mobile banking prototype with a **life-moment engine** behind it. It notices when
something may have changed in a customer's life (a move, a new baby, travelling more), **asks** the
customer instead of assuming, explains why it asks, and — once confirmed — first helps protect the
contracts the customer already has, before offering anything new, and only if the customer agreed to that.

## The idea

**Detect → ask → explain → protect first → offer only with consent.**

- The system detects a *possibility*, never a fact. Every notification is a question
  ("Have you recently moved?"), never a statement.
- "Why am I seeing this?" shows the evidence in plain language.
- Nothing changes until the customer confirms. Dismissing is one tap and final.
- After confirmation, **service actions** that fix an existing contract come first
  (update the insured address, add a child to the family insurance, "you're already covered").
- **Commercial offers** only appear when the customer's consent allows it.
- The system is also allowed to say *"you don't need anything"* (Thomas).

## How it works

```
transactions, policies, app behaviour (last 90 days)
        │
        ▼
 sensitive filter ── hospital / pharmacy payments removed, never used as evidence
        │
        ▼
 signals ── new recurring rent, first payment to a new energy provider, child benefit,
        │   3+ travel bookings per month, address outdated on home insurance, …
        ▼
 likelihood-ratio scoring ── odds = prior/(1-prior) × Π LR (strongest signal per group)
        │                    confidence = odds / (1 + odds)
        ▼
 threshold ── ≥ 0.85 direct question · 0.50–0.85 softer question · < 0.50 nothing
        │     (+ customer's proactivity level and muted topics)
        ▼
 question to the customer ── confirm / dismiss
        │
        ▼
 service actions (protect existing contracts) ── one tap, really updates the contract
        │
        ▼
 consent-filtered offers ── none: none · basic: max 1 · tailored: all
```

Everything is offline and explainable: no ML, no LLM. All priors, likelihood ratios, groups and
thresholds live in [`lib/detection/config.ts`](lib/detection/config.ts), each with a one-line
rationale (team estimates).

## How to run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Tests: `npm test`. State is in memory; restart the server or use
**Reset demo** on the employee page to start over.

`SESSION_SECRET` is required in production (min. 32 characters) — the app refuses to start without it.
In development a random per-process secret is used when it is missing.

## Demo logins and what to try

| Login | Consent | Try this |
|---|---|---|
| **Sarah** | basic | Home → "Something may have changed" → *Why am I seeing this?* → **Yes** → "Add your child to your family insurance" → **Confirm change** (2 → 3 people). Only **one** offer, because her consent is basic. Her hospital payment is visible in her transactions but never used as evidence. |
| **Benjamin** | tailored | Confirm the move → "Update the address on your home insurance" (old → new address) → done. Offers are visible because consent is tailored. |
| **Thomas** | none | Confirm → **"You're already covered for travel with your card"**. No sale. |
| **Emma** | tailored | Only ordinary messages. Her one furniture purchase and one flight are not enough. |
| **KBC employee** | – | 2,000 synthetic customers scanned, precision/recall per life event, threshold slider, *Explain the math* for each demo customer, **Reset demo**. |

Also try **Settings**: switch between "Only what protects my contracts", "Light suggestions" and
"Personal proposals" and watch the suggestions change.

## Privacy & legal choices

- **Synthetic data only.** Counterparties are pseudonymised IDs.
- **Health data excluded:** hospital and pharmacy payments are filtered out *before* any signal is
  computed (unit-tested).
- **Consent tiers** decide whether offers are shown at all; service actions that protect an existing
  contract are always allowed.
- **Asks before acting:** no contract changes without an explicit tap by the customer.
- **No pricing or credit decisions** are made by the engine. Offers are demo placeholders.
- The customer sees the evidence and can dismiss; a dismissed moment is never asked again.

## Security

Built to be audited (Aikido) for IDOR, authentication, authorization and business-logic flaws:

- **Session-based access:** HMAC-SHA256 signed cookie (`httpOnly`, `sameSite=lax`, `secure` in
  production, 8 h expiry). The customer is *always* taken from the session — no endpoint accepts a
  customer id (only the demo login itself).
- **Ownership checks in the data layer:** another customer's event, notification or action returns
  **404**. Only `detected → confirmed | dismissed` is allowed (409 otherwise). Actions can only be
  completed for recommendations currently offered for the customer's *confirmed* event, and only once.
- **Roles:** employee routes require the employee role. Debug routes (`/api/debug/*`) and the
  employee login are disabled when `NODE_ENV=production`.
- **Input validation:** zod on every body, param and query; generic error messages, no stack traces.
- **CSRF defence:** `sameSite=lax` plus an `Origin` check on every state-changing request.
- **Headers:** CSP `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`.
- No secrets in the repo; `.env*.local` is git-ignored.
- Security behaviour is covered by route-level tests in `tests/security.test.ts`.

## Scale

The challenge asks how this scales to 2.3 million customers. The employee dashboard runs the same
engine over **2,000 synthetic customers** (seeded PRNG, planted life events with only *partial*
evidence, plus near-misses such as a holiday abroad or helping a friend move) and measures
**precision and recall** against the planted ground truth. A full scan takes a few hundred ms in
development on a laptop, i.e. linear, stateless scoring per customer that parallelises trivially.
The threshold slider shows the trade-off: at 0.5 roughly 83% precision / 83% recall overall; at
0.65 precision reaches 100% while recall drops to ~70%.

## API

| Method | Path | Notes |
|---|---|---|
| POST / DELETE / GET | `/api/session` | demo login (`{ customerId }`), logout, who am I |
| GET | `/api/me/customer`, `/accounts`, `/transactions?limit=`, `/policies`, `/notifications`, `/events` | session customer only |
| PATCH | `/api/me/consent` | `{ marketing?, proactivityLevel? }` |
| POST | `/api/events/:eventId/confirm` · `/dismiss` | 404 if not yours, 409 if not `detected` |
| GET | `/api/me/recommendations` | confirmed events only, consent-filtered |
| POST | `/api/me/actions/:recommendationId` | body `{}`; 404 if not offered to you, 409 if already done |
| POST | `/api/notifications/:id/read` | 404 if not yours |
| GET | `/api/employee/overview?threshold=` | employee only |
| GET | `/api/debug/events[?customer=]` | employee only, dev only |
| POST | `/api/debug/reset` | employee only, dev only |

## Project layout

```
app/(app)/            customer app: dashboard, accounts, transactions, settings,
                      notifications, recommendations, apply/[id]
app/employee/         KBC-side dashboard
app/api/              route handlers (thin: auth + validation, then lib/)
lib/types.ts          shared contract
lib/data/             mock data, in-memory store, synthetic population
lib/detection/        config, sensitive filter, signals, detector, overview
lib/recommendations/  catalogue + consent filter
lib/auth/             signed session, guards
lib/client/api.ts     the only place the frontend calls the API
components/ui/        shared UI kit · components/life/ life-moment components
tests/                vitest: detection, recommendations, security
```

## Unfinished / next steps

- Friendlier, multilingual question wording via an LLM (only event type + evidence descriptions sent,
  template fallback, never allowed to change the score) — not built.
- Persistence: state is in memory and resets on restart.
- Employee access in production would need real staff authentication (SSO); the demo employee
  login is dev-only.
- Offers are placeholders; a real rollout needs product, pricing and compliance review.
- Likelihood ratios are team estimates; with real (consented) data they should be calibrated.
