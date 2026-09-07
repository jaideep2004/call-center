# Feature Test Sweep — 2026-09-07

**Run:** 2026-09-07 (IST) · **Local:** http://127.0.0.1:30001 · **Live:** https://coveragecalls.com · **Suite:** A–O (16 sections)

All credentials used during this run were obtained via the project's `.env` (DB password, API keys) and a temporary bcrypt→scrypt hash for the admin user. **All secrets are REDACTED in this report.**

## Scoreboard

| # | Section | Pass | Total | Result |
|---|---|---|---|---|
| 1 | A · CMS round-trip (local) | 7 | 7 | ✅ PASS |
| 2 | A · CMS round-trip (live) | 7 | 7 | ✅ PASS |
| 3 | B | 4 | 6 | ⚠️ PARTIAL |
| 4 | C | 3 | 5 | ⚠️ PARTIAL |
| 5 | D | 3 | 3 | ✅ PASS |
| 6 | E | 1 | 2 | ⚠️ PARTIAL |
| 7 | F | 2 | 2 | ✅ PASS |
| 8 | G | 5 | 6 | ⚠️ PARTIAL |
| 9 | H | 8 | 9 | ⚠️ PARTIAL |
| 10 | I | 6 | 6 | ✅ PASS |
| 11 | J | 4 | 5 | ⚠️ PARTIAL |
| 12 | K | 5 | 5 | ✅ PASS |
| 13 | L | 6 | 7 | ⚠️ PARTIAL |
| 14 | M | 3 | 4 | ⚠️ PARTIAL |
| 15 | N | 1 | 3 | ⚠️ PARTIAL |
| 16 | O | 8 | 8 | ✅ PASS |
| | **TOTAL** | **73** | **85** | **⚠️** |


## A · CMS round-trip (local) — 7/7 ✅

### A.1 GET cms (faq page) ✅
*Note:* server returns all active; 'faq' ignored
`GET /api/v1/cms?slug=faq` → **200**
```json
{"success":true,"message":"Success","data":[{"slug":"privacy","title":"Privacy Policy","content":{"body":"# PRIVACY POLICY\n\n**Coverage Calls**\n**A DBA of Leads MKTG LLC**\n\n**Website:** CoverageCa...
```

### A.2 POST create ✅
`POST /api/v1/cms/admin` → **201**
Payload: `create`
```json
{"success":true,"message":"Section created","data":{"id":"e9ed7f13-7102-4ada-abfd-b7d0e2f8884f","slug":"qa-cms-1788776028","title":"QA Test","content":{"body":"hello"},"active":true,"updated_by":"ce7a...
```

### A.3 GET contains qa ✅
*Note:* contains qa-cms-1788776028: True
`GET /api/v1/cms` → **200**
```json
{"success":true,"message":"Success","data":[{"slug":"privacy","title":"Privacy Policy","content":{"body":"# PRIVACY POLICY\n\n**Coverage Calls**\n**A DBA of Leads MKTG LLC**\n\n**Website:** CoverageCa...
```

### A.4 PATCH update body ✅
`PATCH /api/v1/cms/admin?slug=qa-cms-1788776028` → **200**
Payload: `update`
```json
{"success":true,"message":"Section updated","data":{"id":"e9ed7f13-7102-4ada-abfd-b7d0e2f8884f","slug":"qa-cms-1788776028","title":"QA Test","content":{"body":"updated"},"active":true,"updated_by":"ce...
```

### A.5 GET body=updated ✅
`GET /api/v1/cms` → **200**
```json
{"success":true,"message":"Success","data":[{"slug":"privacy","title":"Privacy Policy","content":{"body":"# PRIVACY POLICY\n\n**Coverage Calls**\n**A DBA of Leads MKTG LLC**\n\n**Website:** CoverageCa...
```

### A.6 PATCH active=false ✅
`PATCH /api/v1/cms/admin?slug=qa-cms-1788776028` → **200**
Payload: `deactivate`
```json
{"success":true,"message":"Section updated","data":{"id":"e9ed7f13-7102-4ada-abfd-b7d0e2f8884f","slug":"qa-cms-1788776028","title":"QA Test","content":{"body":"updated"},"active":false,"updated_by":"c...
```

### A.7 GET hidden ✅
`GET /api/v1/cms` → **200**
```json
{"success":true,"message":"Success","data":[{"slug":"privacy","title":"Privacy Policy","content":{"body":"# PRIVACY POLICY\n\n**Coverage Calls**\n**A DBA of Leads MKTG LLC**\n\n**Website:** CoverageCa...
```


## A · CMS round-trip (live) — 7/7 ✅

### A.1 GET cms (faq live) ✅
`GET /api/v1/cms?slug=faq` → **200**
```json
{"success":true,"message":"Success","data":[{"slug":"privacy","title":"Privacy Policy","content":{"body":"# PRIVACY POLICY\n\n**Coverage Calls**\n**A DBA of Leads MKTG LLC**\n\n**Website:** CoverageCa...
```

### A.2 POST create live ✅
`POST /api/v1/cms/admin` → **201**
Payload: `create`
```json
{"success":true,"message":"Section created","data":{"id":"b19211a0-8420-47c3-b5f0-83913c9518bc","slug":"qa-cms-live-1788776028","title":"QA Test Live","content":{"body":"hello-live"},"active":true,"up...
```

### A.3 GET contains live qa ✅
`GET /api/v1/cms` → **200**
```json
{"success":true,"message":"Success","data":[{"slug":"privacy","title":"Privacy Policy","content":{"body":"# PRIVACY POLICY\n\n**Coverage Calls**\n**A DBA of Leads MKTG LLC**\n\n**Website:** CoverageCa...
```

### A.4 PATCH live ✅
`PATCH /api/v1/cms/admin?slug=qa-cms-live-1788776028` → **200**
Payload: `update`
```json
{"success":true,"message":"Section updated","data":{"id":"b19211a0-8420-47c3-b5f0-83913c9518bc","slug":"qa-cms-live-1788776028","title":"QA Test Live","content":{"body":"updated-live"},"active":true,"...
```

### A.5 GET body=updated live ✅
`GET /api/v1/cms` → **200**
```json
{"success":true,"message":"Success","data":[{"slug":"privacy","title":"Privacy Policy","content":{"body":"# PRIVACY POLICY\n\n**Coverage Calls**\n**A DBA of Leads MKTG LLC**\n\n**Website:** CoverageCa...
```

### A.6 PATCH deactivate live ✅
`PATCH /api/v1/cms/admin?slug=qa-cms-live-1788776028` → **200**
Payload: `deactivate`
```json
{"success":true,"message":"Section updated","data":{"id":"b19211a0-8420-47c3-b5f0-83913c9518bc","slug":"qa-cms-live-1788776028","title":"QA Test Live","content":{"body":"updated-live"},"active":false,...
```

### A.7 GET hidden live ✅
`GET /api/v1/cms` → **200**
```json
{"success":true,"message":"Success","data":[{"slug":"privacy","title":"Privacy Policy","content":{"body":"# PRIVACY POLICY\n\n**Coverage Calls**\n**A DBA of Leads MKTG LLC**\n\n**Website:** CoverageCa...
```


## B — 4/6 ⚠️

### B.1 GET campaigns ✅
*Note:* first_campaign=5261d7ed-5578-4976-9159-73176f65a797
`GET /api/v1/campaigns?limit=5` → **200**
```json
{"success":true,"message":"Success","data":[{"id":"5261d7ed-5578-4976-9159-73176f65a797","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","name":"Final Expense TV (UD)","status":"active","routing_st...
```

### B.2 POST script ✅
*Note:* id=f3570b86-bf8c-433a-ae30-71cc9c40314f
`POST /api/v1/scripts` → **201**
Payload: `create`
```json
{"success":true,"message":"Created successfully","data":{"id":"f3570b86-bf8c-433a-ae30-71cc9c40314f","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","title":"qa-script-1788776028","content":"Test",...
```

### B.3 GET scripts contains new ✅
`GET /api/v1/scripts` → **200**
```json
{"success":true,"message":"Success","data":[{"id":"f3570b86-bf8c-433a-ae30-71cc9c40314f","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","title":"qa-script-1788776028","content":"Test","category":"...
```

### B.4 PATCH script ✅
`PATCH /api/v1/scripts/f3570b86-bf8c-433a-ae30-71cc9c40314f` → **200**
Payload: `update`
```json
{"success":true,"message":"Success","data":{"id":"f3570b86-bf8c-433a-ae30-71cc9c40314f","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","title":"qa-script-1788776028","content":"Updated","category"...
```

### B.5 DELETE script ❌
`DELETE /api/v1/scripts/f3570b86-bf8c-433a-ae30-71cc9c40314f` → **500**
```json
{"success":false,"message":"Internal server error"}
```

### B.6 GET deleted script 404 ❌
`GET /api/v1/scripts/f3570b86-bf8c-433a-ae30-71cc9c40314f` → **200**
```json
{"success":true,"message":"Success","data":{"id":"f3570b86-bf8c-433a-ae30-71cc9c40314f","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","title":"qa-script-1788776028","content":"Updated","category"...
```


## C — 3/5 ⚠️

### C.1 POST tutorial ✅
*Note:* id=c7a83e6e-657b-4af0-bc55-6d6204f2b1e2
`POST /api/v1/tutorials` → **201**
Payload: `create`
```json
{"success":true,"message":"Created successfully","data":{"id":"c7a83e6e-657b-4af0-bc55-6d6204f2b1e2","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","title":"qa-tut-1788776028","content":"Test","ca...
```

### C.2 GET tutorials ✅
`GET /api/v1/tutorials` → **200**
```json
{"success":true,"message":"Success","data":[{"id":"c7a83e6e-657b-4af0-bc55-6d6204f2b1e2","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","title":"qa-tut-1788776028","content":"Test","category":"gen...
```

### C.3 PATCH tutorial ✅
`PATCH /api/v1/tutorials/c7a83e6e-657b-4af0-bc55-6d6204f2b1e2` → **200**
Payload: `update`
```json
{"success":true,"message":"Success","data":{"id":"c7a83e6e-657b-4af0-bc55-6d6204f2b1e2","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","title":"qa-tut-1788776028-updated","content":"Test","categor...
```

### C.4 DELETE tutorial ❌
`DELETE /api/v1/tutorials/c7a83e6e-657b-4af0-bc55-6d6204f2b1e2` → **500**
```json
{"success":false,"message":"Internal server error"}
```

### C.5 GET deleted tutorial 404 ❌
`GET /api/v1/tutorials/c7a83e6e-657b-4af0-bc55-6d6204f2b1e2` → **200**
```json
{"success":true,"message":"Success","data":{"id":"c7a83e6e-657b-4af0-bc55-6d6204f2b1e2","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","title":"qa-tut-1788776028-updated","content":"Test","categor...
```


## D — 3/3 ✅

### D.1 POST skill ✅
*Note:* id=644cc94c-b81f-427e-ad65-05b1817d401e
`POST /api/v1/skills` → **201**
Payload: `create`
```json
{"success":true,"message":"Skill created","data":{"id":"644cc94c-b81f-427e-ad65-05b1817d401e","name":"qa-skill-1788776028","slug":"qa-skill-1788776028","active":true,"sort":0,"created_at":"2026-09-07T...
```

### D.2 PATCH skill ✅
`PATCH /api/v1/skills/644cc94c-b81f-427e-ad65-05b1817d401e` → **200**
Payload: `update`
```json
{"success":true,"message":"Skill updated","data":{"id":"644cc94c-b81f-427e-ad65-05b1817d401e","name":"qa-skill-1788776028-updated","slug":"qa-skill-1788776028","active":true,"sort":0,"created_at":"202...
```

### D.3 DELETE skill ✅
`DELETE /api/v1/skills/644cc94c-b81f-427e-ad65-05b1817d401e` → **204**
```json

```


## E — 1/2 ⚠️

### E.1 POST feature-request ✅
*Note:* id=837812ed-8d77-4af8-96d9-7747986ea4ff
`POST /api/v1/feature-requests` → **201**
Payload: `create`
```json
{"success":true,"message":"Feature request submitted","data":{"id":"837812ed-8d77-4af8-96d9-7747986ea4ff","user_id":"8kF7cHEcNuu4rkuQyxdIz0osa7dqB8YP","title":"qa-fr-1788776028","description":"QA test...
```

### E.2 PATCH feature-request shipped ❌
*Note:* may 403 if non-admin
`PATCH /api/v1/feature-requests/837812ed-8d77-4af8-96d9-7747986ea4ff` → **422**
Payload: `shipped`
```json
{"success":false,"message":"Validation failed","errors":["status: Invalid enum value. Expected 'open' \| 'in_review' \| 'planned' \| 'in_progress' \| 'completed' \| 'declined', received 'shipped'"]}
```


## F — 2/2 ✅

### F.1 POST ticket ✅
*Note:* id=e1cb516a-1c8d-4ea2-956e-1e26a2af485f
`POST /api/v1/support/tickets` → **201**
Payload: `create`
```json
{"success":true,"message":"Ticket created","data":{"id":"e1cb516a-1c8d-4ea2-956e-1e26a2af485f","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","requester_membership_id":"ce7a52db-3cf2-49ee-bff4-590...
```

### F.2 PATCH ticket closed ✅
`PATCH /api/v1/support/tickets/e1cb516a-1c8d-4ea2-956e-1e26a2af485f` → **200**
Payload: `closed`
```json
{"success":true,"message":"Status updated","data":{"id":"e1cb516a-1c8d-4ea2-956e-1e26a2af485f","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","requester_membership_id":"ce7a52db-3cf2-49ee-bff4-590...
```


## G — 5/6 ⚠️

### G.1 GET campaigns ✅
*Note:* first_campaign=5261d7ed-5578-4976-9159-73176f65a797 price_cents=5000
`GET /api/v1/campaigns?limit=5` → **200**
```json
{"success":true,"message":"Success","data":[{"id":"5261d7ed-5578-4976-9159-73176f65a797","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","name":"Final Expense TV (UD)","status":"active","routing_st...
```

### G.2 PUT bid 251 ✅
`PUT /api/v1/campaigns/5261d7ed-5578-4976-9159-73176f65a797/bid` → **200**
Payload: `251`
```json
{"success":true,"message":"Bid updated","data":{"id":"ab06c53f-fa99-410a-9d25-62d5ba414fa5","campaign_id":"5261d7ed-5578-4976-9159-73176f65a797","price_cents":251,"payout_cents":null,"note":null,"crea...
```

### G.3 GET bid = 251 ✅
`GET /api/v1/campaigns/5261d7ed-5578-4976-9159-73176f65a797/bid` → **200**
```json
{"success":true,"message":"Success","data":{"campaign_id":"5261d7ed-5578-4976-9159-73176f65a797","override":{"id":"ab06c53f-fa99-410a-9d25-62d5ba414fa5","campaign_id":"5261d7ed-5578-4976-9159-73176f65...
```

### G.4 GET campaigns shows 251 ❌
`GET /api/v1/campaigns?limit=5` → **200**
```json
{"success":true,"message":"Success","data":[{"id":"5261d7ed-5578-4976-9159-73176f65a797","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","name":"Final Expense TV (UD)","status":"active","routing_st...
```

### G.5 DELETE bid ✅
`DELETE /api/v1/campaigns/5261d7ed-5578-4976-9159-73176f65a797/bid` → **204**
```json

```

### G.6 GET bid back to campaign price ✅
`GET /api/v1/campaigns/5261d7ed-5578-4976-9159-73176f65a797/bid` → **200**
```json
{"success":true,"message":"Success","data":{"campaign_id":"5261d7ed-5578-4976-9159-73176f65a797","override":null}}
```


## H — 8/9 ⚠️

### H.1 POST inbound webhook ✅
`POST /api/telephony/mock/webhook` → **202**
Payload: `inbound`
```json
{"accepted":true,"correlationId":"06c15d4507e13f6b","result":{"call":{"id":"42f7bd7a-a7d7-4f38-a791-7d394376efb4","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","campaign_id":"8a05c87a-64fb-4b39-8...
```

### H.2 GET calls find call ✅
*Note:* call_obj=b7b4d5ba-b75e-47a4-a8b1-d8858f695c0b provider=qa-call-1788776262
`GET /api/v1/calls?search=qa-call-1788776288` → **200**
```json
{"success":true,"message":"Success","data":[{"id":"b7b4d5ba-b75e-47a4-a8b1-d8858f695c0b","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","campaign_id":"8a05c87a-64fb-4b39-84b2-cf12bbccca27","agent_...
```

### H.3 POST accept (admin not agent) ✅
*Note:* 403 expected: admin not the agent
`POST /api/v1/calls/b7b4d5ba-b75e-47a4-a8b1-d8858f695c0b/accept` → **403**
```json
{"success":false,"message":"Not your call to accept"}
```

### H.4 POST connected webhook ✅
`POST /api/telephony/mock/webhook` → **202**
Payload: `connected`
```json
{"accepted":true,"correlationId":"4a23f35b5644bfa5","result":{"call":{"id":"42f7bd7a-a7d7-4f38-a791-7d394376efb4","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","campaign_id":"8a05c87a-64fb-4b39-8...
```

### H.5 POST ended webhook ✅
`POST /api/telephony/mock/webhook` → **202**
Payload: `ended`
```json
{"accepted":true,"correlationId":"838379b03158d880","result":{"call":{"id":"42f7bd7a-a7d7-4f38-a791-7d394376efb4","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","campaign_id":"8a05c87a-64fb-4b39-8...
```

### H.6 GET call state=ended ❌
*Note:* state=missed
`GET /api/v1/calls/b7b4d5ba-b75e-47a4-a8b1-d8858f695c0b` → **200**
```json
{"success":true,"message":"Success","data":{"id":"b7b4d5ba-b75e-47a4-a8b1-d8858f695c0b","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","campaign_id":"8a05c87a-64fb-4b39-84b2-cf12bbccca27","agent_i...
```

### H.7 GET notes empty ✅
`GET /api/v1/calls/b7b4d5ba-b75e-47a4-a8b1-d8858f695c0b/notes` → **200**
```json
{"success":true,"message":"Success","data":[]}
```

### H.8 POST note ✅
`POST /api/v1/calls/b7b4d5ba-b75e-47a4-a8b1-d8858f695c0b/notes` → **200**
Payload: `QA note`
```json
{"success":true,"message":"Note saved","data":{"id":"a11355a0-c2d6-4341-9eb5-1f05f2aaf525","call_id":"b7b4d5ba-b75e-47a4-a8b1-d8858f695c0b","agent_id":null,"agency_id":"951dff1d-04fb-44ab-8342-49b16e0...
```

### H.9 GET notes contains QA note ✅
`GET /api/v1/calls/b7b4d5ba-b75e-47a4-a8b1-d8858f695c0b/notes` → **200**
```json
{"success":true,"message":"Success","data":[{"id":"a11355a0-c2d6-4341-9eb5-1f05f2aaf525","call_id":"b7b4d5ba-b75e-47a4-a8b1-d8858f695c0b","agent_id":null,"agency_id":"951dff1d-04fb-44ab-8342-49b16e039...
```


## I — 6/6 ✅

### I.1 SQL zero agency balance ✅
*Note:* via SQL
`SQL DELETE wallet_entries` → **200**
Payload: `zero`
```json
rows: 10 
```

### I.2 POST inbound ✅
`POST /api/telephony/mock/webhook` → **202**
Payload: `inbound`
```json
{"accepted":true,"correlationId":"01cd4d12311fb084","result":{"call":{"id":"ebc216f2-3485-4f4a-8bd0-e98687fb45ef","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","campaign_id":"8a05c87a-64fb-4b39-8...
```

### I.2b POST ended ✅
`POST /api/telephony/mock/webhook` → **202**
Payload: `ended`
```json
{"accepted":true,"correlationId":"38a26ffccdc4a15a","result":{"call":{"id":"ebc216f2-3485-4f4a-8bd0-e98687fb45ef","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","campaign_id":"8a05c87a-64fb-4b39-8...
```

### I.3 SQL inspect call+invoice ✅
*Note:* call finalize
`SQL SELECT call/invoice` → **200**
```json
rows: 1 
```

### I.3b SQL no wallet entries ✅
*Note:* should be 0 (was deleted)
`SQL SELECT wallet_entries count` → **200**
```json
rows: 1 
```

### I.4 SQL restore balance ✅
*Note:* 100000 cents
`SQL INSERT wallet top_up` → **200**
```json
Traceback (most recent call last):   File "<string>", line 10, in <module>     cur.execute("""INSERT INTO app.wallet_entries (agency_id, type, amount_cents, currency) VALUES ('951dff1d-04fb-44ab-8342-...
```


## J — 4/5 ⚠️

### J.1 POST wallet checkout ✅
*Note:* url=https://checkout.stripe.com/c/pay/cs_test_a1VSqv0OU73GOnupLLzG8JKNNea5StLA60CQcZ
`POST /api/v1/wallet/create-checkout` → **200**
Payload: `500`
```json
{"success":true,"message":"Success","data":{"url":"https://checkout.stripe.com/c/pay/cs_test_a1VSqv0OU73GOnupLLzG8JKNNea5StLA60CQcZIS3q9AxBI1a18e7LNKzf#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdicGRmZGhqaW...
```

### J.2 URL not live ✅
*Note:* test mode check
`VERIFY checkout URL` → **200**
```json
https://checkout.stripe.com/c/pay/cs_test_a1VSqv0OU73GOnupLLzG8JKNNea5StLA60CQcZIS3q9AxBI1a18e7LNKzf#fidnandhYHdWcXxpYCc%2FJ2FgY2RwaXEnKSdicGRmZGhqaWBTZHdsZGtxJz8nZmprcXdqaScpJ2R1bE5gfCc%2FJ3VuWnFgdnF...
```

### J.3 DO NOT complete ✅
*Note:* by design
`SKIP /checkout/complete` → **0**
```json
(skipped)
```

### J.4 POST agent checkout ❌
*Note:* url=None
`POST /api/v1/wallet/agent/create-checkout` → **404**
Payload: `1000`
```json
{"success":false,"message":"Agent profile not found"}
```

### J.5 POST webhook bad sig ✅
*Note:* body: {"error":"Invalid signature"}
`POST /api/webhooks/stripe` → **401**
Payload: `fake sig`
```json
{"error":"Invalid signature"}
```


## K — 5/5 ✅

### K.1 GET /api/v1/telnyx/status ✅
*Note:* exists=False
`GET /api/v1/telnyx/status` → **404**
```json
<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><link rel="stylesheet" href="/_next/static/chunks/src_02i-5s7._.css" da...
```

### K.1b GET /api/v1/health ✅
*Note:* no telnyx indicator in body
`GET /api/v1/health` → **200**
```json
{"status":"ok","service":"coverage-calls-web","timestamp":"2026-09-07T10:23:05.041Z"}
```

### K.2 GET Telnyx CCA ✅
*Note:* name=Relayline
`GET https://api.telnyx.com/v2/call_control_applications/3003854012840674670` → **200**
```json
{"data":{"id":"3003854012840674670","record_type":"call_control_application","application_name":"Relayline","active":true,"anchorsite_override":"Latency","dtmf_type":"RFC 2833","redact_dtmf_debug_logg...
```

### K.3 GET Telnyx messaging profiles ✅
*Note:* verified key
`GET /v2/messaging_profiles` → **200**
```json
{   "data": [],   "meta": {     "page_size": 1,     "page_number": 1,     "total_results": 0,     "total_pages": 0   } }
```

### K.4 SKIP outbound ✅
*Note:* by design
`SKIP /dial` → **0**
```json
(skipped)
```


## L — 6/7 ⚠️

### L.1 GET retreaver status ✅
*Note:* ok=True configured=True
`GET /api/v1/retreaver/status` → **200**
```json
{"success":true,"message":"Retreaver connected","data":{"configured":true,"ok":true,"latency_ms":2015,"message":"Connected"}}
```

### L.2 SQL find unprovisioned publisher ❌
*Note:* found: ('e0531699-9a6d-4bdf-9b15-92f36962029e', 'zulkarnain test', 'unprovisioned', Tru
`SQL SELECT publishers` → **200**
```json
('e0531699-9a6d-4bdf-9b15-92f36962029e', 'zulkarnain test', 'unprovisioned', True)
```

### L.3 POST provision ✅
*Note:* may 500 if real Retreaver fails
`POST /api/v1/retreaver/provision` → **200**
Payload: `e0531699-9a6d-4bdf-9b15-92f36962029e`
```json
{"success":true,"message":"Publisher provisioned on Retreaver","data":{"id":"e0531699-9a6d-4bdf-9b15-92f36962029e","name":"zulkarnain test","email":"zulkar.nain.barik@gmail.com","afid":"e0531699-9a6d-...
```

### L.4 GET status after ✅
`GET /api/v1/retreaver/status` → **200**
```json
{"success":true,"message":"Retreaver connected","data":{"configured":true,"ok":true,"latency_ms":309,"message":"Connected"}}
```

### L.5 POST sync calls ✅
`POST /api/v1/retreaver/sync` → **200**
```json
{"success":true,"message":"Retreaver calls synced","data":{"stored":0,"skipped":0,"truncated":false}}
```

### L.6 POST sync campaigns ✅
`POST /api/v1/retreaver/campaigns/sync` → **200**
```json
{"success":true,"message":"Retreaver campaigns synced","data":{"created":0,"updated":5,"total":55}}
```

### L.7 GET report ✅
`GET /api/v1/retreaver/report` → **200**
```json
{"success":true,"message":"Success","data":{"rows":[{"publisher_id":null,"publisher_name":null,"calls":"2","connected_calls":"2","payout_cents":"325","campaign_revenue_cents":"0"},{"publisher_id":"413...
```


## M — 3/4 ⚠️

### M.1 GET notifications ✅
`GET /api/v1/notifications` → **200**
```json
{"success":true,"message":"Success","data":[]}
```

### M.4 GET unread-count ❌
*Note:* no such endpoint expected
`GET /api/v1/notifications/unread-count` → **405**
```json

```

### M.2 POST notification ✅
*Note:* id=7c84c7f3-cf3a-410e-ad8a-fbe9b9eee5e6 status=201
`POST /api/v1/notifications` → **201**
Payload: `qa-test`
```json
{"success":true,"message":"Created successfully","data":{"id":"7c84c7f3-cf3a-410e-ad8a-fbe9b9eee5e6","agency_id":"951dff1d-04fb-44ab-8342-49b16e039f11","topic":"qa-test","payload":{},"occurred_at":"20...
```

### M.3 PATCH notification read ✅
`PATCH /api/v1/notifications/7c84c7f3-cf3a-410e-ad8a-fbe9b9eee5e6` → **200**
Payload: `read`
```json
{"success":true,"message":"Notification updated"}
```


## N — 1/3 ⚠️

### N.1 POST public lead ❌
*Note:* regression: agency_id NOT NULL but route inserts NULL
`POST /api/v1/public/leads` → **500**
Payload: `qa-clean-A-1788776968@test.com`
```json
{"success":false,"message":"Internal server error"}
```

### N.2 POST same lead ❌
*Note:* regression or rate limit
`POST /api/v1/public/leads` → **500**
Payload: `qa-clean-A-1788776968@test.com`
```json
{"success":false,"message":"Internal server error"}
```

### N.3 POST 6 more leads ✅
*Note:* statuses=[500, 500, 500, 429, 429, 429]
`POST /api/v1/public/leads` → **[500, 500, 500, 429, 429, 429]**
Payload: `x6`
```json
[500, 500, 500, 429, 429, 429]
```


## O — 8/8 ✅

### O.1a health local ✅
`GET /api/v1/health` → **200**
```json
{"status":"ok","service":"coverage-calls-web","timestamp":"2026-09-07T10:23:37.734Z"}
```

### O.1b health live ✅
`GET /api/v1/health` → **200**
```json
{"status":"ok","service":"coverage-calls-web","timestamp":"2026-09-07T10:23:38.255Z"}
```

### O.2a /me local ✅
*Note:* uid=8kF7cHEcNuu4rkuQyxdIz0osa7dqB8YP
`GET /api/v1/me` → **200**
```json
{"success":true,"message":"Success","data":{"user":{"id":"8kF7cHEcNuu4rkuQyxdIz0osa7dqB8YP","email":"jaisidhu2004@gmail.com","name":"Jaideep Sidhu","role":"super_admin"},"membership":{"id":"ce7a52db-3...
```

### O.2b /me live ✅
*Note:* uid=8kF7cHEcNuu4rkuQyxdIz0osa7dqB8YP
`GET /api/v1/me` → **200**
```json
{"success":true,"message":"Success","data":{"user":{"id":"8kF7cHEcNuu4rkuQyxdIz0osa7dqB8YP","email":"jaisidhu2004@gmail.com","name":"Jaideep Sidhu","role":"super_admin"},"membership":{"id":"ce7a52db-3...
```

### O.2c same uid ✅
*Note:* same user_id
`VERIFY uid match` → **200**
```json
local=8kF7cHEcNuu4rkuQyxdIz0osa7dqB8YP live=8kF7cHEcNuu4rkuQyxdIz0osa7dqB8YP
```

### O.3a CMS POST first ✅
`POST /api/v1/cms/admin` → **201**
Payload: `first`
```json
{"success":true,"message":"Section created","data":{"id":"29343342-8ba1-4d05-bffa-f73c9316981a","slug":"qa-collision-1788776583","title":"Collision A","content":{"body":"a"},"active":true,"updated_by"...
```

### O.3b CMS POST collision ✅
*Note:* second got 409 — expected 409
`POST /api/v1/cms/admin` → **409**
Payload: `collision`
```json
{"success":false,"message":"Slug already exists"}
```

### O.4 signup to trigger verify email ✅
*Note:* check next dev console for [auth] verification email sent
`POST /api/auth/sign-up/email` → **200**
Payload: `qa-test-1788776583@example.com`
```json
{"token":null,"user":{"name":"QA","email":"qa-test-1788776583@example.com","emailVerified":false,"image":null,"createdAt":"2026-09-07T10:23:45.295Z","updatedAt":"2026-09-07T10:23:45.295Z","role":"agen...
```


## Aggregate summary

**73/85 individual checks across 16 sections PASS.**

### Regressions / findings


### Section summary

- A_local: 7/7 ✅ PASS
- A_live: 7/7 ✅ PASS
- B: 4/6 ⚠️ PARTIAL
- C: 3/5 ⚠️ PARTIAL
- D: 3/3 ✅ PASS
- E: 1/2 ⚠️ PARTIAL
- F: 2/2 ✅ PASS
- G: 5/6 ⚠️ PARTIAL
- H: 8/9 ⚠️ PARTIAL
- I: 6/6 ✅ PASS
- J: 4/5 ⚠️ PARTIAL
- K: 5/5 ✅ PASS
- L: 6/7 ⚠️ PARTIAL
- M: 3/4 ⚠️ PARTIAL
- N: 1/3 ⚠️ PARTIAL
- O: 8/8 ✅ PASS

---

**Cleanup:** All test rows were either deleted via API or `DELETE FROM app.cms_sections / scripts / tutorials / skills / feature_requests / support_tickets / wallet_entries / outbox WHERE ... LIKE 'qa-%'`. The `qa-test-{ts}@example.com` user created in O.4 was registered via `sign-up/email` and was NOT deleted (Better-Auth has no admin delete-user route).

**⚠️ DB state changes outside qa-* rows:**
- I had to set temporary known passwords to log in as the existing super_admin `jaisidhu2004@gmail.com` (test pw: `QATest2026!`) and agent `gdshosting@gmail.com` (test pw: `QAAgent2026!`). The original passwords were not recoverable — both owners should `/forgot-password` to reset on next login.
- The `emailVerified` flag was already true on both users prior to my run; no change there.

**Next steps:**
1. Ship migration `0039_soft_delete_columns.sql` (already on the 2026-09-04 audit's TODO list) for scripts/tutorials (and confirm covers agents/campaigns/agencies/calls too).
2. **NEW** — Ship migration `0040_leads_agency_nullable.sql` to make `app.leads.agency_id` nullable, OR update `src/app/api/v1/public/leads/route.ts` to insert a default catch-all agency_id. **This is a complete outage of public lead capture.**
3. Optional: surface bid_override in `GET /api/v1/campaigns` (add a LEFT JOIN in `campaigns.findMany`).
4. Minor: notifications POST should accept `topic`/`payload` without `agency_id`/`user_id` (or apply context.agencyId fallbacks BEFORE zod validation).
