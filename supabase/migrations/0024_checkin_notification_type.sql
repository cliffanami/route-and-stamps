begin;

-- ROADMAP.md "Check-in" — own migration, mechanically required: a new
-- enum value can't be used in the same transaction that adds it (same
-- split 0008_scheduling_notification_types.sql already established).
alter type notification_type add value 'checked_in';

commit;
