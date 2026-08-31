# UI Rebrand Plan — Coverage Calls

Goal: (1) dashboard → deep-purple premium theme, (2) homepage → premium purple SaaS landing, (3) fonts → Inter/Poppins, (4) brand rename Relayline → "Coverage Calls". Pure frontend work; no API/DB changes.

---

## Current state (verified)

- **Tokens**: `src/styles/tokens.css` — dark green/lime theme (`--acid #d5ff58`, `--cyan #60e7dd`, Fraunces/Manrope/DM Mono). Role-based accents: agency=lime, agent=cyan, publisher=amber.
- **Public skin**: `src/styles/public.css` (189 lines) + landing styles in `src/app/globals.css` (hero, topbar, wordmark).
- **Dashboard skin**: `src/app/globals.css` (console, sidebar, metrics, panels) + components.css/layout.css/typography.css + ~92 inline `var(--…)` usages across pages.
- **Brand**: "RELAYLINE" in 5 wordmark spots, 8 public-page titles/copy, email templates, 2 email "from" defaults, health route, README, 1 test assertion.

---

## Phase 1 — Design token layer (single source of truth)

Rewrite `src/styles/tokens.css` to the **Dashboard UI Color System** (darker purple, sidebar `#14081F`, surfaces `#1F1037`/`#21103B`, chart palette, glows). Keep existing variable NAMES stable so the ~92 inline `var()` usages keep working; only values change.

| Old token | New value (dashboard) | Note |
|---|---|---|
| `--ground` | `#12071E` | app bg |
| `--panel` | `#1F1037` | cards |
| `--ink` | `#FAFAFC` | primary text |
| `--muted` | `#867E99` | secondary |
| `--line` | `#3A225D` | borders |
| `--acid` | `#A855F7` | accent (was lime) |
| `--accent-glow` / `--accent-rgb` | 168, 85, 247 (0.28) | |
| `--cyan` | `#60A5FA` | info blue, kept for analytics sparingly |
| `--amber` | `#F59E0B` | warning (publisher accent) |
| `--orange` | `#EF4444` | error |
| `--serif` → display | `Poppins, sans-serif` | headings |
| `--sans` | `Inter, sans-serif` | body/UI |
| `--mono` | `"JetBrains Mono", ui-monospace, monospace` | IDs/labels |
| status | success `#22C55E`, warning `#F59E0B`, error `#EF4444`, info `#60A5FA` | |
| shadows/glows | purple-tinted per design doc | |

Role accents stay differentiated but purple-family: agent → info blue, publisher → amber (unchanged semantics).

## Phase 2 — Homepage & public skin (Premium Purple SaaS)

Apply the **Homepage UI Design System** to the landing experience:
- `globals.css` landing block (hero, topbar, wordmark, signal rail) → purple hero `#140A26`, ambient purple glow `rgba(168,85,247,0.35)`, gradient CTA `#7A3EF2 → #A855F7`, glass navbar `rgba(255,255,255,0.05)`.
- `src/styles/public.css` → purple section/card surfaces (`#1A1033`, `#22153F`, glass `rgba(255,255,255,0.04)`), purple borders/links.
- `site-header.tsx` / `site-footer.tsx`: gradient primary button, updated wordmark (brand rename below).
- Homepage headline font → Poppins display.

## Phase 3 — Dashboard polish sweep

- Sweep hardcoded legacy greens in `globals.css`: avatar `#265955`, status-band `#101b17`/`#274037`, dropdown `#0d1714`/`#162019`, metric/panel gradients `rgba(25,38,32,…)`, route-map greens, ledger marks → purple equivalents (`#2A184C`, `#21143D`, `rgba(168,85,247,0.08)` glows).
- Charts (`admin-home-charts.tsx`, `reports-charts.tsx`): `var(--cyan)`/`var(--acid)` fills pick up new values automatically; chart-specific palette per design (`#9B5CF8`, `#6D5BFF`, `#D29EFF`) if needed.
- Inline watermark overlays (softphone debug, device-test) inherit tokens — no edit needed beyond token sweep.

## Phase 4 — Brand rename: Relayline → Coverage Calls

| File | Change |
|---|---|
| `src/components/site-header.tsx`, `site-footer.tsx` | wordmark → "COVERAGE CALLS" |
| `src/app/(auth)/layout.tsx`, `src/app/setup/page.tsx` (×2), `src/app/dashboard/layout.tsx` | wordmark |
| `src/app/layout.tsx` | metadata title → "Coverage Calls — Call Operations" |
| 8 public pages (about, why-choose-us, testimonials, pricing, how-it-works, faq, terms, privacy) | title/description/copy strings |
| `src/server/email-templates.ts`, `src/server/email.ts` | subjects, brand bar, `noreply@relayline.com` → `noreply@coveragecalls.com` (confirm domain) |
| `src/app/api/v1/health/route.ts` | `service: "relayline-web"` → `coverage-calls-web` |
| `src/server/email-templates.test.ts` | assertion "RELAYLINE" → "COVERAGE" |
| `README.md`, `package.json` name | optional internal rename |

## Phase 5 — Verification

- `npm run typecheck`
- `npx vitest run` (email template test updated accordingly)
- `npm run build`
- Grep sweep: `relayline|RELAYLINE|#d5ff58|#60e7dd|Fraunces|Manrope|DM Mono|#265955|#101b17` → zero hits

---

## Open questions

1. **Font**: Inter for everything (recommended — best for dense dashboards), or Inter body + Poppins display headings? Poppins everywhere has slightly worse readability for dense data tables.
2. **Email domain**: keep `ops@relayline.io` / `noreply@relayline.com`, or do you have a Coverage Calls domain?
3. **Wordmark treatment**: plain text "COVERAGE CALLS", or add the °-style mark / new logo asset?
4. **Role accent colors**: keep agent=blue and publisher=amber, or purple-ify all three roles?
5. **Scope of rename**: also update `README.md` + `package.json` name (internal, no functional impact)?

Ready to execute Phases 1–3 immediately; Phase 4 (rename) depends on answers to Q2–Q5.