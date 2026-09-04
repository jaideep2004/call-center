# Client Update — 2026-09-04 — Coverage Calls (coveragecalls.com) Live

**Branch:** `main` @ `905b206` · **Build:** `typecheck 0` · `409 passed | 5 skipped` · `195 routes` · **Domain:** `https://coveragecalls.com` (+ `www`) · **VPS:** `srv1904902` · **SSL:** Let's Encrypt valid to `2026-12-03` (auto-renew)

---

## 1. What shipped since last update

### UI overhaul — all 61 dashboards polished (Phases 0–5c + micro-polish)
- **Phase 0:** CMS structured editors (`faq`/`testimonials` list, `privacy`/`terms` markdown + preview, `+ New Section`)
- **Phase 1:** Toast unification — `success | error | warning | info`, queue 3, 4–6s, top-right stack
- **Phase 2:** Email templates light — `BG #F4F5F7 / CARD #FFFFFF / TEXT #111827 / CTA #7C3AED` (fixes invisible text in Gmail/Outlook)
- **Phase 3:** Notification plumbing — `src/server/services/notify.ts` → `app.outbox` + Socket `notification:new` + email per role; publisher topbar badge live
- **Phase 4:** Main dashboard animated charts — `recharts 3.9.2` Area/Line/Bar/Pie donut `animationDuration 900–1200`
- **Phase 5a (admin 12 screens):** `DataTable` + debounced search 300ms + URL sync `?q=&status=&page` + pagination 10/page + names instead of IDs + `Suspense` fix for `useSearchParams`
- **Phase 5b/5c (publisher 5 + agent/shared 22):** same DataTable pattern + Sparkline payout trends, export CSV preserved
- **Micro-polish (61 screens):** no-clip kebab, breathing room (`filter-bar gap4 pad16/18`, `th14 td16`, `card--spacious`), grouped actions, `overflow:visible` on dropdowns
- **Homepage:** `FinalHero` → `HeroV5` + 5 sections (`Process / Agent Call / Dashboard / Features & Pricing / Testimonials / Footer CTA`), 14 new `src/components/landing/*` + `hero-globals.css`

### Auth & email fixes
- Verification email domain fallback — Gmail `SMTP_USER` used when `EMAIL_FROM=noreply@relayline.com` mismatched → delivery fixed
- `/verify` resend UI (`POST /api/auth/send-verification-email` → `{"status":true}`) + logging `[auth] verification email sent`
- **Login redirect fix (2026-09-04):** proxy checked `better-auth.session_token` but production cookie is `__Secure-better-auth.session_token` → always bounced to `/login?redirect=%2Fdashboard`; fixed to check both + `window.location.href` hard reload

### Bugfixes committed to `main`
`bf07d62` Phases 1–4 · `bb9963b` 5a · `c56094e` 5b+5c · `d3bd8dc` kebab+email · `148f5e1` micro-polish · `fb261ee` homepage · `905b206` proxy+login fix — all `main` `921a8fa → 905b206` pushed, VPS `git pull` verified

---

## 2. VPS — Hostinger live deployment (verified 2026-09-04 18:26 UTC)

**DNS (Namecheap):**
- `A @ → <VPS_IP>` + `A www → <VPS_IP>` (`dig coveragecalls.com +short` / `dig www.coveragecalls.com +short` → VPS IP)

**Stack:**
- `Ubuntu` + `Node 22.23.2` + `Docker 27.x` + `pm2` + `nginx` + `certbot`
- Redis via `docker-compose.prod.yml` → `coverage-redis` `127.0.0.1:6379->6379/tcp` `docker exec redis-cli ping → PONG`
- `next-env.d.ts` regenerated per env, `npm ci && npm run build` → 195 routes

**Nginx `/etc/nginx/sites-enabled/coverage`:**
```
server_name coveragecalls.com www.coveragecalls.com;
location /          → proxy_pass http://127.0.0.1:30001;
location /realtime/ → proxy_pass http://127.0.0.1:3002/;
proxy_set_header X-Forwarded-Proto $scheme;
```
`default` site disabled, `nginx -t` OK, firewall `80/443` open, `30001/3002/6379` closed (localhost only)

**SSL:**
```
certbot --nginx -d coveragecalls.com -d www.coveragecalls.com
Certificate: /etc/letsencrypt/live/coveragecalls.com/fullchain.pem
Expires: 2026-12-03 — renew --dry-run succeeded (systemd auto-renew)
```

**Env (live):**
```
BETTER_AUTH_URL=https://coveragecalls.com
NEXT_PUBLIC_APP_URL=https://coveragecalls.com
APP_BASE_URL=https://coveragecalls.com
NEXT_PUBLIC_REALTIME_URL=https://coveragecalls.com
GATEWAY_URL=http://127.0.0.1:3002
REALTIME_PORT=3002
REDIS_URL=redis://127.0.0.1:6379
GATEWAY_PUBLISH_TOKEN=<64-char hex from openssl rand -hex 32 — same for web+gateway>
DATABASE_URL=postgresql://...@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```
`pm2` services: `web` (30001) + `gateway` (3002) `realtime-gateway ready on 3002 / redis bridge connected` + `worker` (pg-boss: billing finalize, retreaver sync 10m, purge 02:00)

**Live checks:**
```
curl https://coveragecalls.com/api/v1/health → {"status":"ok","service":"coverage-calls-web"}
curl https://coveragecalls.com/api/telephony/mock/webhook → {"ok":true,"message":"Webhook endpoint ready (use POST)"}
https://coveragecalls.com → HeroV5 renders
https://coveragecalls.com/login → sign-in → /dashboard (fixed, no loop)
docker ps → coverage-redis Up
pm2 logs gateway → redis bridge connected
```

---

## 3. CMS (admin control today)
- `app.cms_sections` (migration 0034): `slug UNIQUE, title, content jsonb, active`
- Admin `GET /api/v1/cms/admin` + `PATCH /cms/admin?slug=` — controls `faq` `testimonials` `privacy` `terms` live; `+ New section` via `POST`; homepage hero on hold (now `HeroV5` hardcoded, wire to CMS next)

---

## 4. What to demo to client
1. `https://coveragecalls.com` — new homepage
2. `https://coveragecalls.com/register?invite=<token>` → publisher register → `/verify` resend → email link → login → `/dashboard`
3. `Admin → Publishers` — Add Publisher form (responsive 6-col), 3-dots kebab (fixed, no scrollbar clip)
4. `Admin → Dashboard` — animated Area/Line/Pie charts
5. `Publisher → Payouts/Calls/Campaigns` — DataTable search 300ms + pagination + Sparkline

---

## 5. Next steps / TODO
- Wire `HeroV5` to CMS (`hero` slug) when hero CMS unfrozen
- Rotate `GATEWAY_PUBLISH_TOKEN` via `openssl rand -hex 32` if needed (paste same value, `pm2 restart all --update-env`)
- Future deploys: `cd /var/www/call-center && git pull origin main && npm ci && npm run build && pm2 restart all --update-env && pm2 save`

---
*Generated 2026-09-04 — main 905b206 — typecheck 0 · 409 passed · build 195*
