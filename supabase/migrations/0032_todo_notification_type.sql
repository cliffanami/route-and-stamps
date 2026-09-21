-- ============================================================================
-- Route & Stamps — todo_added notification type (ROADMAP.md Milestone AE)
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction that
-- references it, so this has to land and commit before 0033_todos.sql's
-- trigger can use it — same split as 0008_scheduling_notification_types.sql.
-- ============================================================================

begin;
alter type notification_type add value 'todo_added';
commit;
