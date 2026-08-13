-- One-off: cleans up a partial 0001_init.sql run that created the enum
-- types but not the tables. Safe to run since no tables exist yet.
-- Delete this file once you've confirmed 0001_init.sql applies cleanly.

drop type if exists trip_role cascade;
drop type if exists vote_level cascade;
drop type if exists booking_status cascade;
drop type if exists budget_mode cascade;
drop type if exists budget_status cascade;
drop type if exists tip_format cascade;
drop type if exists notification_type cascade;
