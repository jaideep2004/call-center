# Graph Report - call-center  (2026-10-01)

## Corpus Check
- 629 files · ~1,102,260 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1554 nodes · 1578 edges · 54 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 369 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 185|Community 185]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 114 edges
2. `query()` - 70 edges
3. `queryOne()` - 39 edges
4. `refresh()` - 19 edges
5. `emailLayout()` - 17 edges
6. `getTelephonyProvider()` - 12 edges
7. `AgentRepository` - 12 edges
8. `PaymentRepository` - 12 edges
9. `escapeHtml()` - 11 edges
10. `CampaignRepository` - 11 edges

## Surprising Connections (you probably didn't know these)
- `copyLink()` --calls--> `showToast()`  [INFERRED]
  src\app\(public)\blog\[slug]\page.tsx → src\lib\use-toast.ts
- `toggleActive()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\admin\plans\page.tsx → src\lib\use-toast.ts
- `deletePlan()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\admin\plans\page.tsx → src\lib\use-toast.ts
- `handleRecharge()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\wallet\page.tsx → src\lib\use-toast.ts
- `resolveAuth()` --calls--> `query()`  [INFERRED]
  src\server\api-utils.ts → src\server\db.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.01
Nodes (113): handleCreate(), handleDelete(), handleContactAdmin(), handleJoin(), handleTopUp(), refresh(), deleteAgent(), updateApproval() (+105 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (27): allocationForAgent(), AgentSubscriptionRepository, CallEventRepository, listNotes(), createCreative(), listCreatives(), listFeedForAgent(), liveCreativeClause() (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (16): AffiliateRepository, AgentFeeRepository, BidOverrideRepository, BlogPostRepository, CallRepository, CmsSectionRepository, PhoneNumberRepository, PublisherInviteRepository (+8 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (39): assertTransition(), canTransition(), isTerminal(), selectAgent(), decodeClientState(), publishCallEvent(), main(), getRealDid() (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (25): generateMetadata(), main(), clearAuthCache(), decryptSecret(), encryptSecret(), key(), getStripe(), getStripeMode() (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (20): uploadRequest(), findForAgency(), findForAgent(), findForCampaign(), findRoutableAgencyIds(), replaceForCampaign(), transaction(), getTransport() (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (31): agencyInviteEmail(), agentApprovedEmail(), agentWelcomeEmail(), appBaseUrl(), ctaButton(), emailLayout(), escapeHtml(), formatUsd() (+23 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (17): configured(), hashPhone(), request(), requireEnv(), RetreaverError, handleRetreaverWebhook(), linkPair(), linkRetreaverCalls() (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (18): hashPhone(), normalizeE164(), GET(), POST(), creditPool(), debitPool(), effectiveBalanceSql(), getOrCreatePool() (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.1
Nodes (10): requireCallAccess(), scopeFor(), apiHandler(), fail(), publicApiHandler(), requireHeadOr(), requirePermission(), resolveAuth() (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (7): addNote(), addTag(), deleteLead(), fetchData(), removeTag(), updateStatus(), SupportTicketRepository

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (2): CampaignRepository, q()

### Community 12 - "Community 12"
Cohesion: 0.13
Nodes (4): deviceVerified(), NotificationBadge(), toggleAvailability(), useSocket()

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (4): canContinueStep1(), handleContinue(), handleCreateVertical(), handleSubmit()

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (7): AppError, AuthError, ConflictError, ForbiddenError, NotFoundError, RateLimitError, ValidationError

### Community 15 - "Community 15"
Cohesion: 0.23
Nodes (1): AgentRepository

### Community 17 - "Community 17"
Cohesion: 0.24
Nodes (6): createShared(), emit(), emitAll(), getOrCreate(), teardown(), wlog()

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (2): LeadRepository, leadStatusForOutcome()

### Community 19 - "Community 19"
Cohesion: 0.35
Nodes (9): ensureRedis(), findAvailablePort(), killAll(), main(), removeEnvLocal(), resolveDbHost(), startGateway(), startOnPort() (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (2): getClient(), requireEnv()

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (3): isAnswerablePhase(), mapSdkPhase(), SdkCallTracker

### Community 22 - "Community 22"
Cohesion: 0.24
Nodes (4): GET(), POST(), unavailable(), clientIp()

### Community 23 - "Community 23"
Cohesion: 0.36
Nodes (7): getAppBaseUrl(), campaignCid(), deployCampaign(), getCampaignRetreaverNumbers(), retreaverConfigured(), retreaverWebhookUrl(), syncRetreaverCampaigns()

### Community 24 - "Community 24"
Cohesion: 0.29
Nodes (3): handleRecharge(), handleTransfer(), refreshLedger()

### Community 25 - "Community 25"
Cohesion: 0.25
Nodes (1): AgencyRepository

### Community 26 - "Community 26"
Cohesion: 0.25
Nodes (1): MembershipRepository

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (2): driveFileId(), drivePreviewUrl()

### Community 28 - "Community 28"
Cohesion: 0.38
Nodes (6): deletePlan(), featuresFromPlan(), featuresToRecord(), handleSave(), openEditForm(), toggleActive()

### Community 29 - "Community 29"
Cohesion: 0.38
Nodes (3): enumerate(), onChange(), startMic()

### Community 30 - "Community 30"
Cohesion: 0.52
Nodes (6): create(), findById(), findMany(), fullTable(), softDelete(), update()

### Community 33 - "Community 33"
Cohesion: 0.53
Nodes (4): getYoutubeId(), isYoutubeUrl(), tutorialArtwork(), youtubeThumb()

### Community 35 - "Community 35"
Cohesion: 0.6
Nodes (3): isAuthPath(), isStaticAsset(), proxy()

### Community 36 - "Community 36"
Cohesion: 0.4
Nodes (1): copyLink()

### Community 39 - "Community 39"
Cohesion: 0.7
Nodes (4): extractToc(), inline(), renderMarkdown(), slugifyHeading()

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (1): InvoiceRepository

### Community 42 - "Community 42"
Cohesion: 0.5
Nodes (1): SystemSettingRepository

### Community 43 - "Community 43"
Cohesion: 0.83
Nodes (3): apiGet(), main(), signIn()

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (2): getDid(), main()

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (2): handleSubmit(), resetCaptcha()

### Community 46 - "Community 46"
Cohesion: 0.5
Nodes (2): CanAccess(), usePermission()

### Community 47 - "Community 47"
Cohesion: 0.5
Nodes (1): AgentPlanRepository

### Community 48 - "Community 48"
Cohesion: 0.5
Nodes (1): DispositionPayoutRepository

### Community 50 - "Community 50"
Cohesion: 0.5
Nodes (1): RetreaverError

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (2): GET(), pendingMigrations()

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (1): isAdmin()

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (2): handleTimeUpdate(), sendProgress()

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (2): Sparkline(), useReducedMotion()

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (2): xAt(), yAt()

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (2): assertSpendableBalance(), walletBalance()

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (2): findBetterAuthMigration(), seed()

### Community 79 - "Community 79"
Cohesion: 0.67
Nodes (1): FeatureRequestRepository

### Community 83 - "Community 83"
Cohesion: 1.0
Nodes (2): ensurePlatformMembership(), membershipAgency()

### Community 85 - "Community 85"
Cohesion: 0.67
Nodes (1): RetreaverError

### Community 185 - "Community 185"
Cohesion: 1.0
Nodes (1): LeadNoteRepository

## Knowledge Gaps
- **1 isolated node(s):** `LeadNoteRepository`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 11`** (17 nodes): `CampaignRepository`, `.create()`, `.findById()`, `.findByPublisher()`, `.findByRetreaverCid()`, `.findMany()`, `.findManyWithBid()`, `.findRetreaverLinked()`, `.getPublisherIds()`, `.linkRetreaverCid()`, `.setPublisherIds()`, `live-role-play.js`, `ok()`, `q()`, `q1()`, `section()`, `campaigns.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (13 nodes): `AgentRepository`, `.adoptOrCreate()`, `.create()`, `.findAvailable()`, `.findById()`, `.findByIdWithUser()`, `.findByMembershipId()`, `.findByUserId()`, `.findMany()`, `.update()`, `.updateApproval()`, `.updateAvailability()`, `agents.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (12 nodes): `LeadRepository`, `.assign()`, `.create()`, `.createFromCall()`, `.findById()`, `.findMany()`, `.findManyWithFilters()`, `.getDistinctSources()`, `isQualifiedOutcome()`, `leadStatusForOutcome()`, `constants.ts`, `leads.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (10 nodes): `getClient()`, `getEventId()`, `getFromField()`, `getOccurredAt()`, `getToField()`, `keyToPem()`, `requireEnv()`, `resolveCallControlId()`, `resolveEventType()`, `telnyx.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (8 nodes): `agency_wallet_enabled()`, `AgencyRepository`, `.create()`, `.findById()`, `.findBySlug()`, `.findMany()`, `.update()`, `agencies.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (8 nodes): `MembershipRepository`, `.create()`, `.findById()`, `.findByUser()`, `.findByUserAndAgency()`, `.updateRole()`, `.updateStatus()`, `memberships.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (7 nodes): `driveFileId()`, `drivePreviewUrl()`, `formatDuration()`, `formatTimer()`, `normalizeMediaUrl()`, `stripeFeeCents()`, `format.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (5 nodes): `copyLink()`, `formatDate()`, `onScroll()`, `scrollToSection()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (5 nodes): `InvoiceRepository`, `.create()`, `.findById()`, `.findMany()`, `invoices.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (5 nodes): `SystemSettingRepository`, `.get()`, `.getBoolean()`, `.set()`, `system-settings.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (4 nodes): `getDid()`, `main()`, `snapshot()`, `live-monitor.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (4 nodes): `handleSubmit()`, `render()`, `resetCaptcha()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (4 nodes): `CanAccess()`, `usePermission()`, `can-access.tsx`, `use-permission.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (4 nodes): `AgentPlanRepository`, `.findActive()`, `.findByAgency()`, `agent-plans.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (4 nodes): `DispositionPayoutRepository`, `.findByAgency()`, `.upsert()`, `disposition-payouts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (4 nodes): `call()`, `RetreaverError`, `.constructor()`, `phase5.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (3 nodes): `GET()`, `pendingMigrations()`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (3 nodes): `isAdmin()`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (3 nodes): `page.tsx`, `handleTimeUpdate()`, `sendProgress()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (3 nodes): `Sparkline()`, `useReducedMotion()`, `sparkline.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (3 nodes): `xAt()`, `yAt()`, `Analytics.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (3 nodes): `assertSpendableBalance()`, `walletBalance()`, `ledger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (3 nodes): `findBetterAuthMigration()`, `seed()`, `seed.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 79`** (3 nodes): `FeatureRequestRepository`, `.incrementVotes()`, `feature-requests.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 83`** (3 nodes): `ensurePlatformMembership()`, `membershipAgency()`, `platform-agency.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 85`** (3 nodes): `RetreaverError`, `.constructor()`, `retreaver-campaigns.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 185`** (2 nodes): `LeadNoteRepository`, `lead-notes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showToast()` connect `Community 0` to `Community 36`, `Community 10`, `Community 12`, `Community 13`, `Community 45`, `Community 24`, `Community 28`?**
  _High betweenness centrality (0.151) - this node is a cross-community bridge._
- **Why does `query()` connect `Community 1` to `Community 2`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 42`, `Community 15`, `Community 26`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Why does `updateStatus()` connect `Community 10` to `Community 0`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Are the 113 inferred relationships involving `showToast()` (e.g. with `handleSubmit()` and `handleSubmit()`) actually correct?**
  _`showToast()` has 113 INFERRED edges - model-reasoned connections that need verification._
- **Are the 68 inferred relationships involving `query()` (e.g. with `main()` and `resolveAuth()`) actually correct?**
  _`query()` has 68 INFERRED edges - model-reasoned connections that need verification._
- **Are the 38 inferred relationships involving `queryOne()` (e.g. with `main()` and `.findByAgentId()`) actually correct?**
  _`queryOne()` has 38 INFERRED edges - model-reasoned connections that need verification._
- **Are the 18 inferred relationships involving `refresh()` (e.g. with `save()` and `remove()`) actually correct?**
  _`refresh()` has 18 INFERRED edges - model-reasoned connections that need verification._