-- Daily automatic backup at 02:00 UTC (05:00 Iraq time).
-- Enable pg_cron, pg_net and Vault first. Replace all placeholders before running.
-- BACKUP_CRON_SECRET must exactly match the Edge Function secret.

select vault.create_secret('https://hoggakqqtapdhtmoolym.supabase.co', 'individual_form_project_url')
where not exists (select 1 from vault.decrypted_secrets where name = 'individual_form_project_url');

select vault.create_secret('PUBLIC_ANON_KEY', 'individual_form_anon_key')
where not exists (select 1 from vault.decrypted_secrets where name = 'individual_form_anon_key');

select vault.create_secret('BACKUP_CRON_SECRET', 'individual_form_backup_cron_secret')
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
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'individual_form_anon_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'individual_form_backup_cron_secret')
    ),
    body := '{"action":"backup","backupType":"scheduled"}'::jsonb
  );
  $$
);
