# Graph Report - call-center  (2026-09-09)

## Corpus Check
- 441 files · ~619,816 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1093 nodes · 1064 edges · 42 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 251 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 109|Community 109]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 88 edges
2. `query()` - 49 edges
3. `queryOne()` - 26 edges
4. `getTelephonyProvider()` - 12 edges
5. `refresh()` - 10 edges
6. `CampaignRepository` - 10 edges
7. `main()` - 9 edges
8. `AgentRepository` - 9 edges
9. `transaction()` - 8 edges
10. `emailLayout()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `toggleStatus()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\admin\users\page.tsx → src\lib\use-toast.ts
- `handleRecharge()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\wallet\page.tsx → src\lib\use-toast.ts
- `handleTransfer()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\wallet\page.tsx → src\lib\use-toast.ts
- `handleTopUp()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\wallet\agent\page.tsx → src\lib\use-toast.ts
- `query()` --calls--> `acceptPortalInvite()`  [INFERRED]
  src\server\db.ts → src\server\services\publisher-portal.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (70): handleCreate(), updateApproval(), handleCreate(), removeSlot(), setBookingStatus(), toggleActive(), handleExport(), simulateCall() (+62 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (23): AgentSubscriptionRepository, CallEventRepository, listNotes(), findForAgency(), findForAgent(), findForCampaign(), replaceForCampaign(), LeadTagRepository (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (13): AffiliateRepository, AgencyRepository, AgentFeeRepository, AgentRepository, BidOverrideRepository, CallRepository, CmsSectionRepository, MembershipRepository (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (21): handleTopUp(), refresh(), buildContent(), createSection(), save(), toggleActive(), handleConfirm(), handleTabChange() (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (20): selectAgent(), publishCallEvent(), main(), getTelephonyProvider(), calculateBilling(), expireRingingCalls(), requeueStuckRoutingCalls(), runCallMaintenance() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (22): hashPhone(), normalizeE164(), decodeClientState(), GET(), POST(), getRealDid(), main(), getDid() (+14 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (16): configured(), hashPhone(), request(), requireEnv(), RetreaverError, handleRetreaverWebhook(), linkPair(), linkRetreaverCalls() (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (13): main(), decryptSecret(), encryptSecret(), key(), getStripe(), getStripeStatus(), getWebhookSecret(), invalidateStripeCache() (+5 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (7): addNote(), addTag(), deleteLead(), fetchData(), removeTag(), updateStatus(), SupportTicketRepository

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (5): apiHandler(), publicApiHandler(), requirePermission(), canAccessRoute(), hasPermission()

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (2): CampaignRepository, q()

### Community 11 - "Community 11"
Cohesion: 0.24
Nodes (11): getTransport(), sendEmail(), agencyInviteEmail(), ctaButton(), emailLayout(), escapeHtml(), publisherInviteEmail(), resetPasswordEmail() (+3 more)

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (7): AppError, AuthError, ConflictError, ForbiddenError, NotFoundError, RateLimitError, ValidationError

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (3): canContinueStep1(), handleContinue(), handleSubmit()

### Community 14 - "Community 14"
Cohesion: 0.17
Nodes (2): LeadRepository, leadStatusForOutcome()

### Community 15 - "Community 15"
Cohesion: 0.35
Nodes (9): ensureRedis(), findAvailablePort(), killAll(), main(), removeEnvLocal(), resolveDbHost(), startGateway(), startOnPort() (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.24
Nodes (4): GET(), POST(), unavailable(), clientIp()

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (2): getClient(), requireEnv()

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (4): handleRefresh(), fetchData(), handleRecharge(), handleTransfer()

### Community 21 - "Community 21"
Cohesion: 0.36
Nodes (4): enumerate(), onChange(), startMic(), stopMic()

### Community 22 - "Community 22"
Cohesion: 0.52
Nodes (6): create(), findById(), findMany(), fullTable(), softDelete(), update()

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (1): acceptPortalInvite()

### Community 24 - "Community 24"
Cohesion: 0.52
Nodes (6): campaignCid(), deployCampaign(), getCampaignRetreaverNumbers(), retreaverConfigured(), retreaverWebhookUrl(), syncRetreaverCampaigns()

### Community 27 - "Community 27"
Cohesion: 0.6
Nodes (3): isAuthPath(), isStaticAsset(), proxy()

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (2): assertTransition(), canTransition()

### Community 32 - "Community 32"
Cohesion: 0.4
Nodes (1): InvoiceRepository

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (1): SystemSettingRepository

### Community 34 - "Community 34"
Cohesion: 0.4
Nodes (1): TutorialRepository

### Community 36 - "Community 36"
Cohesion: 0.83
Nodes (3): apiGet(), main(), signIn()

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (2): getDid(), main()

### Community 38 - "Community 38"
Cohesion: 0.5
Nodes (1): scopeFor()

### Community 39 - "Community 39"
Cohesion: 0.5
Nodes (2): CanAccess(), usePermission()

### Community 41 - "Community 41"
Cohesion: 0.5
Nodes (1): DispositionPayoutRepository

### Community 43 - "Community 43"
Cohesion: 0.5
Nodes (1): RetreaverError

### Community 47 - "Community 47"
Cohesion: 0.67
Nodes (1): isAdmin()

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (2): xAt(), yAt()

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (2): assertSpendableBalance(), walletBalance()

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (2): findBetterAuthMigration(), seed()

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (1): AgentPlanRepository

### Community 62 - "Community 62"
Cohesion: 0.67
Nodes (1): FeatureRequestRepository

### Community 66 - "Community 66"
Cohesion: 0.67
Nodes (1): RetreaverError

### Community 109 - "Community 109"
Cohesion: 1.0
Nodes (1): LeadNoteRepository

## Knowledge Gaps
- **1 isolated node(s):** `LeadNoteRepository`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (16 nodes): `CampaignRepository`, `.create()`, `.findById()`, `.findByPublisher()`, `.findByRetreaverCid()`, `.findMany()`, `.findManyWithBid()`, `.getPublisherIds()`, `.linkRetreaverCid()`, `.setPublisherIds()`, `live-role-play.js`, `ok()`, `q()`, `q1()`, `section()`, `campaigns.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (12 nodes): `LeadRepository`, `.assign()`, `.create()`, `.createFromCall()`, `.findById()`, `.findMany()`, `.findManyWithFilters()`, `.getDistinctSources()`, `isQualifiedOutcome()`, `leadStatusForOutcome()`, `constants.ts`, `leads.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (10 nodes): `getClient()`, `getEventId()`, `getFromField()`, `getOccurredAt()`, `getToField()`, `keyToPem()`, `requireEnv()`, `resolveCallControlId()`, `resolveEventType()`, `telnyx.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (7 nodes): `acceptPortalInvite()`, `createPortalInvite()`, `getPortalCalls()`, `getPortalOverview()`, `getPortalPayouts()`, `getPublisherForUser()`, `publisher-portal.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (5 nodes): `assertTransition()`, `canTransition()`, `isQualifiedCall()`, `isTerminal()`, `calls.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (5 nodes): `InvoiceRepository`, `.create()`, `.findById()`, `.findMany()`, `invoices.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (5 nodes): `SystemSettingRepository`, `.get()`, `.getBoolean()`, `.set()`, `system-settings.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (5 nodes): `TutorialRepository`, `.create()`, `.findByAgency()`, `.update()`, `tutorials.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (4 nodes): `getDid()`, `main()`, `snapshot()`, `live-monitor.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (4 nodes): `scopeFor()`, `route.ts`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (4 nodes): `CanAccess()`, `usePermission()`, `can-access.tsx`, `use-permission.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (4 nodes): `DispositionPayoutRepository`, `.findByAgency()`, `.upsert()`, `disposition-payouts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (4 nodes): `call()`, `RetreaverError`, `.constructor()`, `phase5.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (3 nodes): `isAdmin()`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (3 nodes): `xAt()`, `yAt()`, `Analytics.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (3 nodes): `assertSpendableBalance()`, `walletBalance()`, `ledger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (3 nodes): `findBetterAuthMigration()`, `seed()`, `seed.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (3 nodes): `AgentPlanRepository`, `.findByAgency()`, `agent-plans.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (3 nodes): `FeatureRequestRepository`, `.incrementVotes()`, `feature-requests.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (3 nodes): `RetreaverError`, `.constructor()`, `retreaver-campaigns.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (2 nodes): `LeadNoteRepository`, `lead-notes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showToast()` connect `Community 0` to `Community 8`, `Community 3`, `Community 20`, `Community 13`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `query()` connect `Community 1` to `Community 33`, `Community 2`, `Community 3`, `Community 8`, `Community 10`, `Community 23`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Why does `updateStatus()` connect `Community 8` to `Community 0`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Are the 87 inferred relationships involving `showToast()` (e.g. with `handleSubmit()` and `handleSubmit()`) actually correct?**
  _`showToast()` has 87 INFERRED edges - model-reasoned connections that need verification._
- **Are the 47 inferred relationships involving `query()` (e.g. with `.findMany()` and `.updateEarned()`) actually correct?**
  _`query()` has 47 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `queryOne()` (e.g. with `.findByAgentId()` and `.findByCode()`) actually correct?**
  _`queryOne()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `getTelephonyProvider()` (e.g. with `POST()` and `requeueStuckRoutingCalls()`) actually correct?**
  _`getTelephonyProvider()` has 11 INFERRED edges - model-reasoned connections that need verification._