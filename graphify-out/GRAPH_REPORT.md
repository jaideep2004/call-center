# Graph Report - call-center  (2026-09-28)

## Corpus Check
- 615 files · ~1,086,817 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1522 nodes · 1539 edges · 50 communities detected
- Extraction: 77% EXTRACTED · 23% INFERRED · 0% AMBIGUOUS · INFERRED: 358 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 16|Community 16]]
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
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 180|Community 180]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 112 edges
2. `query()` - 69 edges
3. `queryOne()` - 37 edges
4. `refresh()` - 19 edges
5. `emailLayout()` - 17 edges
6. `getTelephonyProvider()` - 12 edges
7. `AgentRepository` - 12 edges
8. `escapeHtml()` - 11 edges
9. `CampaignRepository` - 11 edges
10. `PaymentRepository` - 10 edges

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
Nodes (112): handleCreate(), handleDelete(), handleContactAdmin(), handleJoin(), handleTopUp(), refresh(), deleteAgent(), updateApproval() (+104 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (32): allocationForAgent(), AgentSubscriptionRepository, CallEventRepository, listNotes(), findForAgency(), findForAgent(), findForCampaign(), replaceForCampaign() (+24 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (17): AffiliateRepository, AgentFeeRepository, BidOverrideRepository, BlogPostRepository, CallRepository, CmsSectionRepository, MembershipRepository, PhoneNumberRepository (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (36): selectAgent(), decodeClientState(), publishCallEvent(), main(), getRealDid(), main(), getDid(), main() (+28 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (37): getTransport(), sendEmail(), smtpConfigured(), agencyInviteEmail(), agentApprovedEmail(), agentWelcomeEmail(), appBaseUrl(), ctaButton() (+29 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (17): generateMetadata(), requireCallAccess(), scopeFor(), apiHandler(), clearAuthCache(), fail(), publicApiHandler(), requireHeadOr() (+9 more)

### Community 6 - "Community 6"
Cohesion: 0.1
Nodes (22): uploadRequest(), main(), decryptSecret(), encryptSecret(), key(), getStripe(), getStripeMode(), getStripeStatus() (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (17): configured(), hashPhone(), request(), requireEnv(), RetreaverError, handleRetreaverWebhook(), linkPair(), linkRetreaverCalls() (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.13
Nodes (17): hashPhone(), normalizeE164(), GET(), POST(), creditPool(), effectiveBalanceSql(), getOrCreatePool(), getPool() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (7): addNote(), addTag(), deleteLead(), fetchData(), removeTag(), updateStatus(), SupportTicketRepository

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (2): CampaignRepository, q()

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (4): deviceVerified(), NotificationBadge(), toggleAvailability(), useSocket()

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (4): canContinueStep1(), handleContinue(), handleCreateVertical(), handleSubmit()

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (7): AppError, AuthError, ConflictError, ForbiddenError, NotFoundError, RateLimitError, ValidationError

### Community 14 - "Community 14"
Cohesion: 0.23
Nodes (1): AgentRepository

### Community 16 - "Community 16"
Cohesion: 0.24
Nodes (6): createShared(), emit(), emitAll(), getOrCreate(), teardown(), wlog()

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (2): LeadRepository, leadStatusForOutcome()

### Community 18 - "Community 18"
Cohesion: 0.35
Nodes (9): ensureRedis(), findAvailablePort(), killAll(), main(), removeEnvLocal(), resolveDbHost(), startGateway(), startOnPort() (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (2): getClient(), requireEnv()

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (3): isAnswerablePhase(), mapSdkPhase(), SdkCallTracker

### Community 21 - "Community 21"
Cohesion: 0.24
Nodes (4): GET(), POST(), unavailable(), clientIp()

### Community 22 - "Community 22"
Cohesion: 0.36
Nodes (7): getAppBaseUrl(), campaignCid(), deployCampaign(), getCampaignRetreaverNumbers(), retreaverConfigured(), retreaverWebhookUrl(), syncRetreaverCampaigns()

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (3): handleRecharge(), handleTransfer(), refreshLedger()

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (1): AgencyRepository

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (2): driveFileId(), drivePreviewUrl()

### Community 26 - "Community 26"
Cohesion: 0.38
Nodes (6): deletePlan(), featuresFromPlan(), featuresToRecord(), handleSave(), openEditForm(), toggleActive()

### Community 27 - "Community 27"
Cohesion: 0.38
Nodes (3): enumerate(), onChange(), startMic()

### Community 28 - "Community 28"
Cohesion: 0.52
Nodes (6): create(), findById(), findMany(), fullTable(), softDelete(), update()

### Community 29 - "Community 29"
Cohesion: 0.29
Nodes (1): ScriptRepository

### Community 32 - "Community 32"
Cohesion: 0.53
Nodes (4): getYoutubeId(), isYoutubeUrl(), tutorialArtwork(), youtubeThumb()

### Community 34 - "Community 34"
Cohesion: 0.6
Nodes (3): isAuthPath(), isStaticAsset(), proxy()

### Community 35 - "Community 35"
Cohesion: 0.4
Nodes (1): copyLink()

### Community 38 - "Community 38"
Cohesion: 0.5
Nodes (2): assertTransition(), canTransition()

### Community 39 - "Community 39"
Cohesion: 0.7
Nodes (4): extractToc(), inline(), renderMarkdown(), slugifyHeading()

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (1): InvoiceRepository

### Community 42 - "Community 42"
Cohesion: 0.83
Nodes (3): apiGet(), main(), signIn()

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (2): getDid(), main()

### Community 44 - "Community 44"
Cohesion: 0.5
Nodes (2): CanAccess(), usePermission()

### Community 45 - "Community 45"
Cohesion: 0.5
Nodes (1): AgentPlanRepository

### Community 46 - "Community 46"
Cohesion: 0.5
Nodes (1): DispositionPayoutRepository

### Community 48 - "Community 48"
Cohesion: 0.5
Nodes (1): RetreaverError

### Community 55 - "Community 55"
Cohesion: 0.67
Nodes (1): isAdmin()

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (2): handleTimeUpdate(), sendProgress()

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (2): Sparkline(), useReducedMotion()

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (2): xAt(), yAt()

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (2): assertSpendableBalance(), walletBalance()

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (2): findBetterAuthMigration(), seed()

### Community 77 - "Community 77"
Cohesion: 0.67
Nodes (1): FeatureRequestRepository

### Community 82 - "Community 82"
Cohesion: 0.67
Nodes (1): RetreaverError

### Community 180 - "Community 180"
Cohesion: 1.0
Nodes (1): LeadNoteRepository

## Knowledge Gaps
- **1 isolated node(s):** `LeadNoteRepository`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (17 nodes): `CampaignRepository`, `.create()`, `.findById()`, `.findByPublisher()`, `.findByRetreaverCid()`, `.findMany()`, `.findManyWithBid()`, `.findRetreaverLinked()`, `.getPublisherIds()`, `.linkRetreaverCid()`, `.setPublisherIds()`, `live-role-play.js`, `ok()`, `q()`, `q1()`, `section()`, `campaigns.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (13 nodes): `AgentRepository`, `.adoptOrCreate()`, `.create()`, `.findAvailable()`, `.findById()`, `.findByIdWithUser()`, `.findByMembershipId()`, `.findByUserId()`, `.findMany()`, `.update()`, `.updateApproval()`, `.updateAvailability()`, `agents.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (12 nodes): `LeadRepository`, `.assign()`, `.create()`, `.createFromCall()`, `.findById()`, `.findMany()`, `.findManyWithFilters()`, `.getDistinctSources()`, `isQualifiedOutcome()`, `leadStatusForOutcome()`, `constants.ts`, `leads.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (10 nodes): `getClient()`, `getEventId()`, `getFromField()`, `getOccurredAt()`, `getToField()`, `keyToPem()`, `requireEnv()`, `resolveCallControlId()`, `resolveEventType()`, `telnyx.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (8 nodes): `agency_wallet_enabled()`, `AgencyRepository`, `.create()`, `.findById()`, `.findBySlug()`, `.findMany()`, `.update()`, `agencies.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (7 nodes): `driveFileId()`, `drivePreviewUrl()`, `formatDuration()`, `formatTimer()`, `normalizeMediaUrl()`, `stripeFeeCents()`, `format.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (7 nodes): `ScriptRepository`, `.create()`, `.findByAgency()`, `.findScriptsForCampaign()`, `.findUnbound()`, `.update()`, `scripts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (5 nodes): `copyLink()`, `formatDate()`, `onScroll()`, `scrollToSection()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (5 nodes): `assertTransition()`, `canTransition()`, `isQualifiedCall()`, `isTerminal()`, `calls.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (5 nodes): `InvoiceRepository`, `.create()`, `.findById()`, `.findMany()`, `invoices.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (4 nodes): `getDid()`, `main()`, `snapshot()`, `live-monitor.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (4 nodes): `CanAccess()`, `usePermission()`, `can-access.tsx`, `use-permission.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (4 nodes): `AgentPlanRepository`, `.findActive()`, `.findByAgency()`, `agent-plans.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (4 nodes): `DispositionPayoutRepository`, `.findByAgency()`, `.upsert()`, `disposition-payouts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (4 nodes): `call()`, `RetreaverError`, `.constructor()`, `phase5.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (3 nodes): `isAdmin()`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (3 nodes): `page.tsx`, `handleTimeUpdate()`, `sendProgress()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (3 nodes): `Sparkline()`, `useReducedMotion()`, `sparkline.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (3 nodes): `xAt()`, `yAt()`, `Analytics.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (3 nodes): `assertSpendableBalance()`, `walletBalance()`, `ledger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (3 nodes): `findBetterAuthMigration()`, `seed()`, `seed.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (3 nodes): `FeatureRequestRepository`, `.incrementVotes()`, `feature-requests.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 82`** (3 nodes): `RetreaverError`, `.constructor()`, `retreaver-campaigns.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 180`** (2 nodes): `LeadNoteRepository`, `lead-notes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showToast()` connect `Community 0` to `Community 35`, `Community 9`, `Community 11`, `Community 12`, `Community 23`, `Community 26`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `query()` connect `Community 1` to `Community 2`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 14`, `Community 29`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `updateStatus()` connect `Community 9` to `Community 0`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Are the 111 inferred relationships involving `showToast()` (e.g. with `handleSubmit()` and `handleSubmit()`) actually correct?**
  _`showToast()` has 111 INFERRED edges - model-reasoned connections that need verification._
- **Are the 67 inferred relationships involving `query()` (e.g. with `main()` and `resolveAuth()`) actually correct?**
  _`query()` has 67 INFERRED edges - model-reasoned connections that need verification._
- **Are the 36 inferred relationships involving `queryOne()` (e.g. with `main()` and `.findByAgentId()`) actually correct?**
  _`queryOne()` has 36 INFERRED edges - model-reasoned connections that need verification._
- **Are the 18 inferred relationships involving `refresh()` (e.g. with `save()` and `remove()`) actually correct?**
  _`refresh()` has 18 INFERRED edges - model-reasoned connections that need verification._