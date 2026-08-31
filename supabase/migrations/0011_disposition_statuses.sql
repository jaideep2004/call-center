-- 0011_disposition_statuses.sql
-- Rename 'voicemail' -> 'dead_call', add 'dead_air' to dispositions + disposition_payouts

alter table app.dispositions
  drop constraint if exists dispositions_outcome_check,
  add constraint dispositions_outcome_check check (outcome in ('sold','not_interested','no_answer','dead_call','dead_air','follow_up','disqualified'));

alter table app.disposition_payouts
  drop constraint if exists disposition_payouts_outcome_check,
  add constraint disposition_payouts_outcome_check check (outcome in ('sold','not_interested','no_answer','dead_call','dead_air','follow_up','disqualified'));

update app.dispositions set outcome = 'dead_call' where outcome = 'voicemail';
update app.disposition_payouts set outcome = 'dead_call' where outcome = 'voicemail';
