# Project Update — 2026-09-04 — Coverage Calls — Live Deployment

**Domain:** `https://coveragecalls.com` (+ `www`) · **SSL:** Let's Encrypt valid to `2026-12-03` (auto-renew) · **Build:** `195 routes` · **Status:** Live and verified

---

## 1. Platform Updates

### Dashboard Experience — All 61 Screens Refined
- **Content Management:** Structured editors for FAQ and Testimonials, markdown support for Privacy and Terms with live preview, plus ability to add new sections
- **Notifications & Feedback:** Unified toast system across the platform with clear success / error / warning states
- **Email Communications:** Light, professional templates optimized for Gmail and Outlook
- **Analytics:** Animated charts on the main dashboard for revenue and call activity
- **Data Tables:** Consistent search, filtering, sorting and pagination across Admin, Publisher and Agent views
- **Overall Polish:** Improved spacing, responsive layouts, and corrected dropdown behavior across all screens
- **Homepage:** New HeroV5 design with 5 content sections — Process, Agent Call Experience, Dashboard Preview, Features & Pricing, Testimonials and Footer CTA

### Authentication & Email Reliability
- Verification email delivery corrected for production mail configuration
- Verification resend option available on the verification page
- Login flow now redirects reliably to the dashboard after sign-in on the live domain

---

## 2. Live Deployment — coveragecalls.com

**Domain & DNS:**
- `coveragecalls.com` and `www.coveragecalls.com` both point to the production VPS and resolve correctly

**Infrastructure:**
- Production VPS with Node 22, Docker, process manager and web server
- Redis for real-time events — operational and verified
- Application built and running with 195 routes

**Security:**
- HTTPS enabled for both `coveragecalls.com` and `www.coveragecalls.com` via Let's Encrypt
- Automatic renewal configured; firewall allows `80`/`443` only, internal services remain on localhost

**Environment:**
- Live URLs configured for authentication, application links and real-time communications
- Core services running: Web (30001), Real-time Gateway (3002) and Background Worker (billing, data sync)

**Verification (2026-09-04 18:26 UTC):**
- `https://coveragecalls.com/api/v1/health` → operational
- `https://coveragecalls.com/api/telephony/mock/webhook` → ready
- `https://coveragecalls.com` → homepage renders correctly
- `https://coveragecalls.com/login` → sign-in redirects to dashboard as expected
- Real-time gateway and Redis — connected

---

## 3. Content Management

- Admin panel provides live control over FAQ, Testimonials, Privacy and Terms
- New sections can be added without code changes
- Homepage sections are currently managed as part of the build and can be connected to the CMS on request

---

## 4. Live Walkthrough

1. `https://coveragecalls.com` — Homepage overview
2. `https://coveragecalls.com/register?invite=<token>` — Publisher registration → verification → login → dashboard
3. `Admin → Publishers` — Publisher management and actions
4. `Admin → Dashboard` — Analytics and activity overview
5. `Publisher → Payouts / Calls / Campaigns` — Publisher reporting views

---

## 5. Next Steps

- Connect homepage hero section to the CMS when approved
- Ongoing maintenance and deployments will follow the standard pull, build and restart process

---
*Prepared 2026-09-04 — Coverage Calls*
