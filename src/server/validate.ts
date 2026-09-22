import { z } from "zod";
import { ValidationError } from "./errors";
import { DISPOSITION_OUTCOMES } from "./constants";
import { callStates } from "@/domain/calls";

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().email().max(255);
export const phoneSchema = z.string().regex(/^\+[1-9]\d{6,14}$/, "Phone must be E.164 format");

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export const sortSchema = z.object({
  sortBy: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid sort column").optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});
export const searchSchema = z.object({
  search: z.string().max(255).optional(),
});

export const createAgencySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  // Phase 3 (point 6): active members must explicitly confirm leaving their
  // current agency — the membership is moved to the new agency in-txn.
  leaveAgency: z.boolean().optional(),
});

export const updateAgencySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(["pending", "active", "suspended", "closed"]).optional(),
  currency: z.string().length(3).optional(),
  recording_retention_days: z.number().int().min(0).optional(),
});

export const createPublisherSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255).optional().or(z.literal("")),
  afid: z.string().max(64).optional().or(z.literal("")),
  commission_pct: z.number().int().min(0).max(100).default(0),
  fixed_price_cents: z.number().int().min(1).optional(),
  active: z.boolean().default(true),
});

export const updatePublisherSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional().or(z.literal("")),
  afid: z.string().max(64).optional().or(z.literal("")),
  commission_pct: z.number().int().min(0).max(100).optional(),
  fixed_price_cents: z.number().int().min(1).nullable().optional(),
  active: z.boolean().optional(),
  retreaver_status: z.enum(["active", "paused"]).optional(),
});

/** Publisher self-service profile update (portal settings page). */
export const updatePublisherSelfSchema = z.object({
  email: z.string().email().max(255),
});

export const createCmsSectionSchema = z.object({
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(255),
  content: z.record(z.unknown()).default({}),
});

export const updateCmsSectionSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
});

const blogSlug = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/);

export const createBlogPostSchema = z.object({
  slug: blogSlug,
  title: z.string().min(1).max(255),
  excerpt: z.string().max(500).default(""),
  cover_image: z.string().url().max(500).nullable().optional(),
  category: z.string().min(1).max(80).default("General"),
  tags: z.array(z.string().max(40)).max(12).default([]),
  author_name: z.string().max(120).default(""),
  author_role: z.string().max(120).default(""),
  author_avatar: z.string().url().max(500).nullable().optional(),
  read_minutes: z.number().int().min(1).max(120).default(5),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  body_markdown: z.string().max(100000).default(""),
});

export const updateBlogPostSchema = createBlogPostSchema.partial().omit({ slug: true });

export const createAgentSchema = z.object({
  agency_id: z.string().min(1),
  membership_id: z.string().min(1).optional(),
  user_id: z.string().min(1).optional(),
  priority: z.number().int().positive().default(100),
  states: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  licenses: z.array(z.string()).default([]),
  zip_prefixes: z.array(z.string()).default([]),
  endpoint_types: z.array(z.string()).default([]),
  npn: z.string().max(50).optional(),
});

export const updateAgentSchema = z.object({
  priority: z.number().int().positive().optional(),
  approval_status: z.enum(["pending", "approved", "rejected", "suspended"]).optional(),
  availability: z.enum(["offline", "available", "busy", "away"]).optional(),
  states: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  licenses: z.array(z.string()).optional(),
  npn: z.string().max(50).nullable().optional(),
  software_fee_cents: z.number().int().min(0).optional(),
  endpoint_types: z.array(z.enum(["webrtc", "pstn"])).optional(),
  forwarding_number: z.string().max(20).nullable().optional(),
});

export const US_STATE_CODES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"] as const;
export const updateOwnAgentSchema = z.object({
  availability: z.enum(["offline", "available", "busy", "away"]).optional(),
  states: z.array(z.string()).max(60).optional(),
});

export const createCampaignSchema = z.object({
  agency_id: z.string().min(1),
  name: z.string().min(1).max(255),
  routing_strategy: z.enum(["round_robin", "priority"]).default("round_robin"),
  price_cents: z.number().int().min(0).default(0),
  max_publisher_payout_cents: z.number().int().min(0).nullable().optional(),
  min_publisher_payout_cents: z.number().int().min(0).nullable().optional(),
  visibility: z.enum(["default", "exclusive"]).default("default"),
  is_exclusive: z.boolean().default(false),
  buffer_seconds: z.number().int().min(0).default(0),
  min_connected_seconds: z.number().int().min(0).default(0),
  required_skills: z.array(z.string()).default([]),
  publisher_id: z.string().min(1).nullable().optional(),
  publisher_ids: z.array(z.string().min(1)).optional(),
  retreaver_cid: z.string().min(1).max(64).nullable().optional(),
  record_calls: z.boolean().default(true),
  allowed_endpoints: z.array(z.enum(["webrtc", "pstn"])).optional(),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.enum(["draft", "active", "paused", "completed", "archived"]).optional(),
  routing_strategy: z.enum(["round_robin", "priority"]).optional(),
  price_cents: z.number().int().min(0).nullable().optional(),
  max_publisher_payout_cents: z.number().int().min(0).nullable().optional(),
  min_publisher_payout_cents: z.number().int().min(0).nullable().optional(),
  visibility: z.enum(["default", "exclusive"]).optional(),
  is_exclusive: z.boolean().optional(),
  buffer_seconds: z.number().int().min(0).optional(),
  min_connected_seconds: z.number().int().min(0).optional(),
  required_skills: z.array(z.string()).optional(),
  publisher_id: z.string().min(1).nullable().optional(),
  publisher_ids: z.array(z.string().min(1)).nullable().optional(),
  rtb_enabled: z.boolean().optional(),
  rtb_postback_key: z.string().min(1).max(512).optional(),
  retreaver_cid: z.string().min(1).max(64).nullable().optional(),
  record_calls: z.boolean().optional(),
  allowed_endpoints: z.array(z.enum(["webrtc", "pstn"])).optional(),
});

export const provisionPublisherSchema = z.object({
  publisher_id: z.string().min(1),
});

export const createRtbReservationSchema = z.object({
  campaign_id: z.string().min(1),
  caller_number: z.string().min(1).max(32).optional(),
  tags: z.record(z.string(), z.string()).optional(),
});

/** P1.3 marketplace pre-selection: ping a publisher campaign, filter buyer offers first. */
export const reserveRtbSchema = z.object({
  publisher_campaign_id: z.string().min(1),
  caller_number: z.string().min(1).max(32).optional(),
  /** Explicit 2-letter caller state override; else derived from caller_number NPA. */
  caller_state: z.string().trim().toUpperCase().pipe(z.string().length(2)).optional(),
  publisher_payout_min_cents: z.number().int().min(0).nullable().optional(),
  publisher_payout_max_cents: z.number().int().min(0).nullable().optional(),
  tags: z.record(z.string(), z.string()).optional(),
  /** P1.5: redelivery with the same key returns the original reservation. */
  idempotency_key: z.string().min(1).max(128).optional(),
});

/** P1.4 agency pool wallet (head only). */
export const agencyPoolCheckoutSchema = z.object({
  amount_cents: z.number().int().min(100).max(1000000),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});

export const agencyAllocationSchema = z.object({
  agent_id: z.string().min(1),
  allocated_cents: z.number().int().min(0).max(100000000),
});

export const agencyPoolEnabledSchema = z.object({
  enabled: z.boolean(),
});

/** P2.1 campaign creatives (agent dashboard ads). */
export const createCreativeSchema = z.object({
  campaign_id: z.string().min(1).nullable().optional(),
  type: z.enum(["image", "video"]),
  title: z.string().min(1).max(255),
  media_url: z.string().url().max(2048),
  thumbnail_url: z.string().url().max(2048).nullable().optional(),
  cta_label: z.string().max(64).nullable().optional(),
  cta_href: z.string().url().max(2048).nullable().optional(),
  placement: z.enum(["agent_hero", "agent_feed"]).default("agent_feed"),
  priority: z.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
});

export const updateCreativeSchema = createCreativeSchema.partial().omit({ campaign_id: true }).extend({
  campaign_id: z.string().min(1).nullable().optional(),
});

/** P2.2 tutorial watch progress (90%+ flips completed server-side). */
export const tutorialProgressSchema = z.object({
  watched_seconds: z.number().min(0).max(86400),
  watched_percent: z.number().min(0).max(100),
  reset: z.boolean().optional(),
});

export const tutorialCategories = ["general", "onboarding", "product", "compliance", "soft_skills"] as const;

/** P2.2 tutorials (Ringel-like): admin create carries display fields the UI sends. */
export const createTutorialSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  category: z.enum(tutorialCategories).default("general"),
  video_url: z.string().url().max(2048).nullable().optional(),
  duration_seconds: z.number().int().min(0).nullable().optional(),
  tags: z.array(z.string()).default([]),
  thumbnail_url: z.string().url().max(2048).nullable().optional(),
  order_index: z.number().int().min(0).default(0),
  published: z.boolean().default(false),
  required: z.boolean().default(false),
});

export const updateTutorialSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  category: z.enum(tutorialCategories).optional(),
  video_url: z.string().url().max(2048).nullable().optional(),
  duration_seconds: z.number().int().min(0).nullable().optional(),
  tags: z.array(z.string()).optional(),
  thumbnail_url: z.string().url().max(2048).nullable().optional(),
  order_index: z.number().int().min(0).optional(),
  published: z.boolean().optional(),
  required: z.boolean().optional(),
});

export const createCallSchema = z.object({
  agency_id: z.string().min(1),
  campaign_id: z.string().min(1),
  provider: z.string().min(1),
  provider_call_id: z.string().min(1),
});

export const updateCallSchema = z.object({
  state: z.enum(callStates).optional(),
  agent_id: z.string().nullable().optional(),
  ended_at: z.string().nullable().optional(),
  connected_at: z.string().nullable().optional(),
});

export const createLeadSchema = z.object({
  agency_id: z.string().min(1),
  source: z.string().max(100).default("manual"),
  email_hash: z.string().optional(),
  phone_hash: z.string().optional(),
});

export const updateLeadSchema = z.object({
  assigned_agent_id: z.string().nullable().optional(),
  source: z.string().max(100).optional(),
  status: z.enum(["new", "contacted", "qualified", "converted", "lost", "disqualified"]).optional(),
});

export const publicLeadSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: phoneSchema,
  message: z.string().max(5000).optional(),
});

export const contactMessageSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  phone: z.string().max(32).optional().default(""),
  agency: z.string().max(255).optional().default(""),
  callVolume: z.string().max(64).optional().default(""),
  inquiryType: z.string().max(100).optional().default(""),
  message: z.string().min(1).max(5000),
});

export const createMembershipSchema = z.object({
  agency_id: z.string().min(1),
  user_id: z.string().min(1),
  role: z.enum(["admin", "agent"]),
});

export const updateMembershipSchema = z.object({
  role: z.enum(["admin", "agent"]).optional(),
  status: z.enum(["invited", "active", "suspended"]).optional(),
});

export const createWalletEntrySchema = z.object({
  agency_id: z.string().min(1),
  type: z.enum(["deposit", "withdrawal", "fee", "refund", "payment", "commission"]),
  amount_cents: z.number().int(),
  currency: z.string().length(3).default("USD"),
  description: z.string().max(500).optional(),
  idempotency_key: z.string().min(1),
});

export const createInvoiceSchema = z.object({
  agency_id: z.string().min(1),
  call_id: z.string().min(1),
  total_cents: z.number().int().min(0),
  currency: z.string().length(3).default("USD"),
  status: z.enum(["pending", "paid", "failed", "refunded"]).default("pending"),
});

export const createNotificationSchema = z.object({
  agency_id: z.string().min(1),
  user_id: z.string().min(1),
  topic: z.string().min(1).max(100),
  payload: z.record(z.unknown()).default({}),
});

export const createAffiliateSchema = z.object({
  agent_id: z.string().min(1),
  code: z.string().min(3).max(50).regex(/^[a-z0-9_-]+$/),
});

export const makeAdminSchema = z.object({
  user_id: z.string().min(1),
  role: z.enum(["admin"]).optional(),
});

export const routingSimulateSchema = z.object({
  campaign_id: z.string().optional(),
  from: z.string().optional(),
});

export const dispositionOutcomes = DISPOSITION_OUTCOMES;

export const createDispositionSchema = z.object({
  outcome: z.enum(dispositionOutcomes),
  notes: z.string().max(2000).optional(),
  annual_premium_cents: z.number().int().positive().optional(),
}).superRefine((data, ctx) => {
  if (data.outcome === "sold" && (data.annual_premium_cents === undefined || data.annual_premium_cents === null)) {
    ctx.addIssue({ code: "custom", path: ["annual_premium_cents"], message: "Annual premium is required for sold dispositions" });
  }
  if (data.outcome !== "sold" && data.annual_premium_cents !== undefined) {
    ctx.addIssue({ code: "custom", path: ["annual_premium_cents"], message: "Annual premium only applies to sold dispositions" });
  }
});

export const updateDispositionPayoutSchema = z.object({
  outcome: z.enum(dispositionOutcomes),
  amount_cents: z.number().int().min(0),
});

export const createAgentPlanSchema = z.object({
  name: z.string().min(1).max(255),
  price_cents: z.number().int().min(0),
  call_allowance: z.number().int().min(1),
  billing_type: z.enum(["prepaid", "postpaid"]).default("prepaid"),
  features: z.record(z.unknown()).optional(),
});

export const updateAgentPlanSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  price_cents: z.number().int().min(0).optional(),
  call_allowance: z.number().int().min(1).optional(),
  billing_type: z.enum(["prepaid", "postpaid"]).optional(),
  features: z.record(z.unknown()).optional(),
  active: z.boolean().optional(),
});

export const createAgentSubscriptionSchema = z.object({
  plan_id: z.string().uuid(),
  auto_renew: z.boolean().optional(),
});

export const agentWalletTopUpSchema = z.object({
  amount_cents: z.number().int().min(100).max(1000000),
  notes: z.string().max(500).optional(),
});

export const createWalletTransferSchema = z.object({
  agent_id: z.string().uuid(),
  amount_cents: z.number().int().min(100).max(1000000),
  reason: z.string().max(500).optional(),
});

export const createSubAgencySchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  commission_rate: z.number().int().min(0).max(100).default(0),
});

export const createInviteSchema = z.object({
  invitee_email: z.string().email().max(255),
});

export const featureRequestStatuses = ["open", "in_review", "planned", "in_progress", "completed", "declined"] as const;

export const createFeatureRequestSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().max(5000).optional(),
});

export const updateFeatureRequestSchema = z.object({
  status: z.enum(featureRequestStatuses).optional(),
  vote: z.boolean().optional(),
});

export const createSkillSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  active: z.boolean().optional(),
  sort: z.number().int().min(0).optional(),
});

export const updateSkillSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  active: z.boolean().optional(),
  sort: z.number().int().min(0).optional(),
});

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const scriptCategories = ["general", "sales", "support", "objection_handling", "closing"] as const;

export const createScriptSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  category: z.enum(scriptCategories).default("general"),
  tags: z.array(z.string()).default([]),
  campaign_id: z.string().min(1).nullable().optional(),
});

export const updateScriptSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  category: z.enum(scriptCategories).optional(),
  tags: z.array(z.string()).optional(),
  campaign_id: z.string().min(1).nullable().optional(),
});

export const createPhoneNumberSchema = z.object({
  number: phoneSchema,
  campaign_id: z.string().min(1),
  provider: z.string().min(1).default("telnyx"),
  // Platform admin only: target agency for the new number. Non-admins always
  // use their own agency (any value they send is ignored).
  agency_id: z.string().min(1).optional(),
});

/** Move a DID between campaigns, or null to park it unassigned (0051). */
export const updatePhoneNumberSchema = z.object({
  campaign_id: z.string().min(1).nullable(),
});

export function validate<T extends z.ZodTypeAny>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new ValidationError("Validation failed", errors);
  }
  return result.data as z.output<T>;
}
