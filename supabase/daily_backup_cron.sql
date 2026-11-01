-- Daily automatic backup at 02:00 UTC (05:00 Iraq time).
-- Run after deploying supabase/functions/admin-tools and setting BACKUP_CRON_SECRET.
-- Replace PROJECT_REF and CRON_SECRET below with your own values before running.
-- Requires Supabase extensions pg_cron, pg_net and Vault to be enabled.

select vault.create_secret('https://PROJECT_REF.supabase.co', 'individual_form_project_url')
where not exists (select 1 from vault.decrypted_secrets where name = 'individual_form_project_url');

select vault.create_secret('CRON_SECRET', 'individual_form_backup_cron_secret')
where not exists (select 1 from vault.decrypted_secrets where name = 'individual_form_backup_cron_secret');

select cron.unschedule(jobid)
from cron.job
where jobname = 'individual-form-daily-backup';

select cron.schedule(
  'individual-form-daily-backup',
  '0 2 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'individual_form_project_url')
           || '/functions/v1/admin-tools',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'individual_form_backup_cron_secret')
    ),
    body := '{"action":"backup","backupType":"scheduled"}'::jsonb
  );
  $$
);
