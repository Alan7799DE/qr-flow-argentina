CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id_deleted_at ON qr_codes(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_qr_scan_events_qr_code_id_scanned_at ON qr_scan_events(qr_code_id, scanned_at);
CREATE INDEX IF NOT EXISTS idx_qr_daily_stats_qr_code_id_scan_date ON qr_daily_stats(qr_code_id, scan_date);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at);