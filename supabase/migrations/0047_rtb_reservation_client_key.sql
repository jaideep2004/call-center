-- 0047: Idempotent RTB reserve (P1.5).
-- Publisher ping redelivery carries the same idempotency key; the second
-- POST returns the original reservation instead of reserving twice.
-- NULL keys never conflict (Postgres unique treats NULLs as distinct), so the
-- legacy direct path (no key) is unaffected.

alter table app.rtb_reservations
  add column if not exists client_key text null;

create unique index if not exists rtb_reservations_client_key_uidx
  on app.rtb_reservations(client_key);
