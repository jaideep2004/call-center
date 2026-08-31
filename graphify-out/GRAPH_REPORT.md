# Graph Report - call-center  (2026-08-26)

## Corpus Check
- 383 files · ~476,800 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 936 nodes · 886 edges · 42 communities detected
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 198 edges (avg confidence: 0.8)
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
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 105|Community 105]]

## God Nodes (most connected - your core abstractions)
1. `showToast()` - 69 edges
2. `query()` - 48 edges
3. `queryOne()` - 26 edges
4. `getTelephonyProvider()` - 12 edges
5. `AgentRepository` - 9 edges
6. `main()` - 8 edges
7. `refresh()` - 8 edges
8. `transaction()` - 8 edges
9. `CallRepository` - 8 edges
10. `LeadRepository` - 8 edges

## Surprising Connections (you probably didn't know these)
- `handleAssign()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\leads\page.tsx → src\lib\use-toast.ts
- `handleTopUp()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\wallet\agent\page.tsx → src\lib\use-toast.ts
- `POST()` --calls--> `decodeClientState()`  [INFERRED]
  src\app\api\telephony\[provider]\webhook\route.ts → src\domain\telephony.ts
- `handleSubmit()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\tutorials\new\page.tsx → src\lib\use-toast.ts
- `save()` --calls--> `showToast()`  [INFERRED]
  src\app\dashboard\admin\cms\page.tsx → src\lib\use-toast.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (22): AgentSubscriptionRepository, CallEventRepository, findForAgency(), findForAgent(), findForCampaign(), replaceForCampaign(), DispositionRepository, LeadTagRepository (+14 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (59): handleCreate(), updateApproval(), handleConfirm(), handleStatus(), handleSubmit(), handleVote(), async(), clearBid() (+51 more)

### Community 2 - "Community 2"
Cohesion: 0.03
Nodes (12): AffiliateRepository, AgencyRepository, AgentFeeRepository, AgentRepository, BidOverrideRepository, CallRepository, CmsSectionRepository, PaymentRepository (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (25): selectAgent(), decodeClientState(), publishCallEvent(), main(), getTelephonyProvider(), calculateBilling(), expireRingingCalls(), requeueStuckRoutingCalls() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (16): configured(), hashPhone(), request(), requireEnv(), RetreaverError, handleRetreaverWebhook(), linkPair(), linkRetreaverCalls() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (11): handleTopUp(), refresh(), save(), toggleActive(), act(), generateMonthly(), generateWeekly(), createTicket() (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (6): addNote(), addTag(), fetchData(), removeTag(), updateStatus(), SupportTicketRepository

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (12): decryptSecret(), encryptSecret(), key(), getStripe(), getStripeStatus(), getWebhookSecret(), invalidateStripeCache(), resolveKey() (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (5): apiHandler(), publicApiHandler(), requirePermission(), canAccessRoute(), hasPermission()

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (7): AppError, AuthError, ConflictError, ForbiddenError, NotFoundError, RateLimitError, ValidationError

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (2): LeadRepository, leadStatusForOutcome()

### Community 11 - "Community 11"
Cohesion: 0.31
Nodes (8): hashPhone(), normalizeE164(), GET(), POST(), callerStateFromNumber(), evaluatePing(), loadNpaCache(), resolveNpaState()

### Community 12 - "Community 12"
Cohesion: 0.38
Nodes (8): findAvailablePort(), killAll(), main(), removeEnvLocal(), resolveDbHost(), startGateway(), startOnPort(), startWorker()

### Community 13 - "Community 13"
Cohesion: 0.24
Nodes (4): GET(), POST(), unavailable(), clientIp()

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (1): handleSubmit()

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (2): getClient(), requireEnv()

### Community 16 - "Community 16"
Cohesion: 0.36
Nodes (4): enumerate(), onChange(), startMic(), stopMic()

### Community 17 - "Community 17"
Cohesion: 0.57
Nodes (7): agencyInviteEmail(), ctaButton(), emailLayout(), escapeHtml(), publisherInviteEmail(), resetPasswordEmail(), verificationEmail()

### Community 18 - "Community 18"
Cohesion: 0.25
Nodes (1): CampaignRepository

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (1): MembershipRepository

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (1): WalletEntryRepository

### Community 21 - "Community 21"
Cohesion: 0.52
Nodes (6): create(), findById(), findMany(), fullTable(), softDelete(), update()

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (1): ScriptRepository

### Community 23 - "Community 23"
Cohesion: 0.52
Nodes (6): campaignCid(), deployCampaign(), getCampaignRetreaverNumbers(), retreaverConfigured(), retreaverWebhookUrl(), syncRetreaverCampaigns()

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (1): handleAssign()

### Community 26 - "Community 26"
Cohesion: 0.6
Nodes (3): isAuthPath(), isStaticAsset(), proxy()

### Community 29 - "Community 29"
Cohesion: 0.5
Nodes (2): assertTransition(), canTransition()

### Community 30 - "Community 30"
Cohesion: 0.4
Nodes (1): InvoiceRepository

### Community 31 - "Community 31"
Cohesion: 0.5
Nodes (1): SystemSettingRepository

### Community 32 - "Community 32"
Cohesion: 0.4
Nodes (1): TutorialRepository

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (1): scopeFor()

### Community 34 - "Community 34"
Cohesion: 0.5
Nodes (2): CanAccess(), usePermission()

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (2): getTransport(), sendEmail()

### Community 37 - "Community 37"
Cohesion: 0.5
Nodes (1): DispositionPayoutRepository

### Community 39 - "Community 39"
Cohesion: 0.5
Nodes (1): RetreaverError

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (2): xAt(), yAt()

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (2): assertSpendableBalance(), walletBalance()

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (2): findBetterAuthMigration(), seed()

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (1): AgentPlanRepository

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (1): FeatureRequestRepository

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (1): RetreaverError

### Community 105 - "Community 105"
Cohesion: 1.0
Nodes (1): LeadNoteRepository

## Knowledge Gaps
- **1 isolated node(s):** `LeadNoteRepository`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (12 nodes): `LeadRepository`, `.assign()`, `.create()`, `.createFromCall()`, `.findById()`, `.findMany()`, `.findManyWithFilters()`, `.getDistinctSources()`, `isQualifiedOutcome()`, `leadStatusForOutcome()`, `constants.ts`, `leads.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (10 nodes): `autoSlug()`, `handleSubmit()`, `toggleList()`, `toggleSkill()`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (10 nodes): `getClient()`, `getEventId()`, `getFromField()`, `getOccurredAt()`, `getToField()`, `keyToPem()`, `requireEnv()`, `resolveCallControlId()`, `resolveEventType()`, `telnyx.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (8 nodes): `CampaignRepository`, `.create()`, `.findById()`, `.findByPublisher()`, `.findByRetreaverCid()`, `.findMany()`, `.linkRetreaverCid()`, `campaigns.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (8 nodes): `MembershipRepository`, `.create()`, `.findById()`, `.findByUser()`, `.findByUserAndAgency()`, `.updateRole()`, `.updateStatus()`, `memberships.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (8 nodes): `WalletEntryRepository`, `.create()`, `.findByAgency()`, `.findByAgent()`, `.findById()`, `.sumByAgency()`, `.sumByAgent()`, `wallet-entries.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (7 nodes): `ScriptRepository`, `.create()`, `.findByAgency()`, `.findScriptsForCampaign()`, `.findUnbound()`, `.update()`, `scripts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (6 nodes): `formatDurationSec()`, `formatPremium()`, `handleAssign()`, `statusBadge()`, `toggleSort()`, `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (5 nodes): `assertTransition()`, `canTransition()`, `isQualifiedCall()`, `isTerminal()`, `calls.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (5 nodes): `InvoiceRepository`, `.create()`, `.findById()`, `.findMany()`, `invoices.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (5 nodes): `SystemSettingRepository`, `.get()`, `.getBoolean()`, `.set()`, `system-settings.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (5 nodes): `TutorialRepository`, `.create()`, `.findByAgency()`, `.update()`, `tutorials.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (4 nodes): `scopeFor()`, `route.ts`, `route.ts`, `route.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (4 nodes): `CanAccess()`, `usePermission()`, `can-access.tsx`, `use-permission.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (4 nodes): `getTransport()`, `sendEmail()`, `smtpConfigured()`, `email.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (4 nodes): `DispositionPayoutRepository`, `.findByAgency()`, `.upsert()`, `disposition-payouts.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (4 nodes): `call()`, `RetreaverError`, `.constructor()`, `phase5.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (3 nodes): `xAt()`, `yAt()`, `Analytics.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (3 nodes): `assertSpendableBalance()`, `walletBalance()`, `ledger.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (3 nodes): `findBetterAuthMigration()`, `seed()`, `seed.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (3 nodes): `AgentPlanRepository`, `.findByAgency()`, `agent-plans.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (3 nodes): `FeatureRequestRepository`, `.incrementVotes()`, `feature-requests.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (3 nodes): `RetreaverError`, `.constructor()`, `retreaver-campaigns.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 105`** (2 nodes): `LeadNoteRepository`, `lead-notes.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `showToast()` connect `Community 1` to `Community 24`, `Community 5`, `Community 14`, `Community 6`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `query()` connect `Community 0` to `Community 2`, `Community 6`, `Community 18`, `Community 19`, `Community 20`, `Community 22`, `Community 31`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `updateStatus()` connect `Community 6` to `Community 1`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Are the 68 inferred relationships involving `showToast()` (e.g. with `handleSubmit()` and `save()`) actually correct?**
  _`showToast()` has 68 INFERRED edges - model-reasoned connections that need verification._
- **Are the 46 inferred relationships involving `query()` (e.g. with `.findMany()` and `.updateEarned()`) actually correct?**
  _`query()` has 46 INFERRED edges - model-reasoned connections that need verification._
- **Are the 25 inferred relationships involving `queryOne()` (e.g. with `.findByAgentId()` and `.findByCode()`) actually correct?**
  _`queryOne()` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Are the 11 inferred relationships involving `getTelephonyProvider()` (e.g. with `POST()` and `requeueStuckRoutingCalls()`) actually correct?**
  _`getTelephonyProvider()` has 11 INFERRED edges - model-reasoned connections that need verification._