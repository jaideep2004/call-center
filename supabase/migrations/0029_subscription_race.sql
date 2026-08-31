-- 0029: One active subscription per agent (Stripe webhook race hardening)

create unique index if not exists agent_subscriptions_active_uq
  on app.agent_subscriptions(agent_id)
  where status = 'active';
