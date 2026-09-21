# Graph Report - call-center  (2026-09-21)

## Corpus Check
- 534 files · ~768,972 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1294 nodes · 1253 edges · 47 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 291 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 145|Community 145]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 99 edges
2. `query()` - 59 edges
3. `queryOne()` - 30 edges
4. `refresh()` - 15 edges
5. `getTelephonyProvider()` - 12 edges
6. `emailLayout()` - 11 edges
7. `AgentRepository` - 10 edges
8. `CampaignRepository` - 10 edges
9. `RtbReservationRepository` - 10 edges
10. `main()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `toggleActive()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\admin\plans\page.tsx → src\lib\use-toast.ts
- `deletePlan()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\admin\plans\page.tsx → src\lib\use-toast.ts
- `updateApproval()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\agents\page.tsx → src\lib\use-toast.ts
- `saveBid()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\campaigns\[id]\page.tsx → src\lib\use-toast.ts
- `clearBid()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\campaigns\[id]\page.tsx → src\lib\use-toast.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (87): handleCreate(), handleContactAdmin(), handleJoin(), handleTopUp(), refresh(), handleExport(), simulateCall(), buildContent() (+79 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (29): AgentSubscriptionRepository, CallEventRepository, listNotes(), findForAgency(), findForAgent(), findForCampaign(), replaceForCampaign(), createCreative() (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (13): AffiliateRepository, AgentFeeRepository, BidOverrideRepository, CallRepository, CmsSectionRepository, PaymentRepository, PhoneNumberRepository, PublisherInviteRepository (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (35): selectAgent(), decodeClientState(), publishCallEvent(), main(), getRealDid(), main(), getDid(), main() (+27 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (18): hashPhone(), normalizeE164(), GET(), POST(), allocationForAgent(), creditPool(), effectiveBalanceSql(), getOrCreatePool() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (19): getTransport(), sendEmail(), smtpConfigured(), agencyInviteEmail(), appBaseUrl(), ctaButton(), emailLayout(), escapeHtml() (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (9): apiHandler(), clearAuthCache(), publicApiHandler(), requireHeadOr(), requirePermission(), resolveAuth(), canAccessRoute(), hasPermission() (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (16): uploadRequest(), main(), decryptSecret(), encryptSecret(), key(), getStripe(), getStripeStatus(), getWebhookSecret() (+8 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (16): configured(), hashPhone(), request(), requireEnv(), RetreaverError, handleRetreaverWebhook(), linkPair(), linkRetreaverCalls() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (7): addNote(), addTag(), deleteLead(), fetchData(), removeTag(), updateStatus(), SupportTicketRepository

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (13): handleConfirm(), handleTabChange(), clearBid(), deployToRetreaver(), handleRename(), loadRetreaverNumbers(), saveAssignments(), saveBid() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (2): CampaignRepository, q()

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (4): canContinueStep1(), handleContinue(), handleCreateVertical(), handleSubmit()

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (7): AppError, AuthError, ConflictError, ForbiddenError, NotFoundError, RateLimitError, ValidationError

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (2): LeadRepository, leadStatusForOutcome()

### Community 16 - "Community 16"
Cohesion: 0.35
Nodes (9): ensureRedis(), findAvailablePort(), killAll(), main(), removeEnvLocal(), resolveDbHost(), startGateway(), startOnPort() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (1): AgentRepository

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (2): getClient(), requireEnv()

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (4): GET(), POST(), unavailable(), clientIp()

### Community 21 - "Community 21"
Cohesion: 0.36
Nodes (7): getAppBaseUrl(), campaignCid(), deployCampaign(), getCampaignRetreaverNumbers(), retreaverConfigured(), retreaverWebhookUrl(), syncRetreaverCampaigns()

### Community 22 - "Community 22"
Cohesion: 0.25
Nodes (1): AgencyRepository

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (1): MembershipRepository

### Community 25 - "Community 25"
Cohesion: 0.38
Nodes (6): deletePlan(), featuresFromPlan(), featuresToRecord(), handleSave(), openEditForm(), toggleActive()

### Community 26 - "Community 26"
Cohesion: 0.38
Nodes (3): enumerate(), onChange(), startMic()

### Community 27 - "Community 27"
Cohesion: 0.52
Nodes (6): create(), findById(), findMany(), fullTable(), softDelete(), update()

### Community 28 - "Community 28"
Cohesion: 0.29
Nodes (1): ScriptRepository

### Community 30 - "Community 30"
Cohesion: 0.53
Nodes (4): getYoutubeId(), isYoutubeUrl(), tutorialArtwork(), youtubeThumb()

### Community 33 - "Community 33"
Cohesion: 0.6
Nodes (3): isAuthPath(), isStaticAsset(), proxy()

### Community 36 - "Community 36"
Cohesion: 0.5
Nodes (2): assertTransition(), canTransition()

### Community 39 - "Community 39"
Cohesion: 0.4
Nodes (1): InvoiceRepository

### Community 41 - "Community 41"
Cohesion: 0.83
Nodes (3): apiGet(), main(), signIn()

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (2): getDid(), main()

### Community 43 - "Community 43"
Cohesion: 0.5
Nodes (1): scopeFor()

### Community 44 - "Community 44"
Cohesion: 0.5
Nodes (1): updateApproval()

### Community 45 - "Community 45"
Cohesion: 0.5
Nodes (2): CanAccess(), usePermission()

### Community 46 - "Community 46"
Cohesion: 0.5
Nodes (1): DispositionPayoutRepository

### Community 48 - "Community 48"
Cohesion: 0.5
Nodes (1): RetreaverError

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (1): isAdmin()

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (2): handleTimeUpdate(), sendProgress()

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (2): Sparkline(), useReducedMotion()

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (2): xAt(), yAt()

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (2): assertSpendableBalance(), walletBalance()

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (2): findBetterAuthMigration(), seed()

### Community 73 - "Community 73"
Cohesion: 0.67
Nodes (1): AgentPlanRepository

### Community 74 - "Community 74"
Cohesion: 0.67
Nodes (1): FeatureRequestRepository

### Community 79 - "Community 79"
Cohesion: 0.67
Nodes (1): RetreaverError

### Community 145 - "Community 145"
Cohesion: 1.0
Nodes (1): LeadNoteRepository

## Knowledge Gaps
- **1 isolated node(s):** `LeadNoteRepository`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 11`** (16 nodes): `CampaignRepository`, `.create()`, `.findById()`, `.findByPublisher()`, `.findByRetreaverCid()`, `.findMany()`, `.findManyWithBid()`, `.getPublisherIds()`, `.linkRetreaverCid()`, `.setPublisherIds()`, `live-role-play.js`, `ok()`, `q()`, `q1()`, `section()`, `campaigns.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (12 nodes): `LeadRepository`, `.assign()`, `.create()`, `.createFromCall()`, `.findById()`, `.findMany()`, `.findManyWithFilters()`, `.getDistinctSources()`, `isQualifiedOutcome()`, `leadStatusForOutcome()`, `constants.ts`, `leads.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (11 nodes): `AgentRepository`, `.create()`, `.findAvailable()`, `.findById()`, `.findByIdWithUser()`, `.findByMembershipId()`, `.findMany()`, `.update()`, `.updateApproval()`, `.updateAvailability()`, `agents.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (10 nodes): `getClient()`, `getEventId()`, `getFromField()`, `getOccurredAt()`, `getToField()`, `keyToPem()`, `requireEnv()`, `resolveCallControlId()`, `resolveEventType()`, `telnyx.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (8 nodes): `agency_wallet_enabled()`, `AgencyRepository`, `.create()`, `.findById()`, `.findBySlug()`, `.findMany()`, `.update()`, `agencies.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (8 nodes): `MembershipRepository`, `.create()`, `.findById()`, `.findByUser()`, `.findByUserAndAgency()`, `.updateRole()`, `.updateStatus()`, `memberships.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (7 nodes): `ScriptRepository`, `.create()`, `.findByAgency()`, `.findScriptsForCampaign()`, `.findUnbound()`, `.update()`, `scripts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (5 nodes): `assertTransition()`, `canTransition()`, `isQualifiedCall()`, `isTerminal()`, `calls.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (5 nodes): `InvoiceRepository`, `.create()`, `.findById()`, `.findMany()`, `invoices.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (4 nodes): `getDid()`, `main()`, `snapshot()`, `live-monitor.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (4 nodes): `scopeFor()`, `route.ts`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (4 nodes): `badgeClass()`, `toggleSelect()`, `updateApproval()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (4 nodes): `CanAccess()`, `usePermission()`, `can-access.tsx`, `use-permission.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (4 nodes): `DispositionPayoutRepository`, `.findByAgency()`, `.upsert()`, `disposition-payouts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (4 nodes): `call()`, `RetreaverError`, `.constructor()`, `phase5.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (3 nodes): `isAdmin()`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (3 nodes): `page.tsx`, `handleTimeUpdate()`, `sendProgress()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (3 nodes): `Sparkline()`, `useReducedMotion()`, `sparkline.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (3 nodes): `xAt()`, `yAt()`, `Analytics.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (3 nodes): `assertSpendableBalance()`, `walletBalance()`, `ledger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (3 nodes): `findBetterAuthMigration()`, `seed()`, `seed.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (3 nodes): `AgentPlanRepository`, `.findByAgency()`, `agent-plans.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (3 nodes): `FeatureRequestRepository`, `.incrementVotes()`, `feature-requests.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (3 nodes): `RetreaverError`, `.constructor()`, `retreaver-campaigns.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 145`** (2 nodes): `LeadNoteRepository`, `lead-notes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showToast()` connect `Community 0` to `Community 9`, `Community 10`, `Community 12`, `Community 44`, `Community 25`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **Why does `updateStatus()` connect `Community 9` to `Community 0`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `query()` connect `Community 1` to `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 9`, `Community 11`, `Community 17`, `Community 23`, `Community 28`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Are the 98 inferred relationships involving `showToast()` (e.g. with `handleSubmit()` and `handleSubmit()`) actually correct?**
  _`showToast()` has 98 INFERRED edges - model-reasoned connections that need verification._
- **Are the 57 inferred relationships involving `query()` (e.g. with `main()` and `resolveAuth()`) actually correct?**
  _`query()` has 57 INFERRED edges - model-reasoned connections that need verification._
- **Are the 29 inferred relationships involving `queryOne()` (e.g. with `main()` and `.findByAgentId()`) actually correct?**
  _`queryOne()` has 29 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `refresh()` (e.g. with `ensureSection()` and `save()`) actually correct?**
  _`refresh()` has 14 INFERRED edges - model-reasoned connections that need verification._