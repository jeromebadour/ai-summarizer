-- Empties the app's tables between browser suites, so each one starts from a fresh database. Run as the owner role.
delete from usage_events;
delete from audit_log;
delete from auth_events;
delete from request_errors;
delete from summaries;
delete from sessions;
update users set role = 'user' where role = 'owner';
delete from users;
update settings set monthly_cap_usd = 40, daily_cap_usd = 3, workspace_cap_usd = 50,
  guests_paused_at = null, guests_paused_by = null, guests_paused_reason = null,
  all_paused_at = null, all_paused_by = null, all_paused_reason = null;
