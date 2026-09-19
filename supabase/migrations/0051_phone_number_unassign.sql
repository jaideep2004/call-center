-- 0051 allow unassigned phone numbers (spare pool inventory).
-- Unassigned rows match nothing: ping evaluation joins on campaign_id
-- (no row => unknown_campaign) and deploy uses findByCampaign, so an
-- unassigned DID can never receive or route traffic until re-attached.
ALTER TABLE app.phone_numbers ALTER COLUMN campaign_id DROP NOT NULL;
