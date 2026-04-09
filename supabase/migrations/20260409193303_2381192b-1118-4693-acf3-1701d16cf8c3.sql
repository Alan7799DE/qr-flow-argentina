SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'process-trial-expirations-daily'),
  schedule := '0 22 * * *'
);