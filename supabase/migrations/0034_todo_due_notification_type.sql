-- ============================================================================
-- Route & Stamps — todo_due notification type (ROADMAP.md live-usage
-- feedback: luggage-forwarding action items need to actually remind, not
-- just sit on a place's page). Own transaction, same reason as
-- 0032_todo_notification_type.sql — ALTER TYPE ... ADD VALUE can't be
-- referenced in the same transaction that adds it.
-- ============================================================================

begin;
alter type notification_type add value 'todo_due';
commit;
