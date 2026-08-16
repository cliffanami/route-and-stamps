-- ============================================================================
-- Route & Stamps — new notification_type enum values, own migration
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction that adds
-- it, so this has to land and commit before anything references these
-- values (the scheduling functions in the next migration, and the
-- join-notification work in a later one).
-- ============================================================================

begin;

alter type notification_type add value 'arrival_estimated';
alter type notification_type add value 'packing_due';
alter type notification_type add value 'trip_joined';

commit;
