-- Migration 00017: Add notification_logs, support_tickets, platform_settings tables

-- 1. notification_logs
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  recipient TEXT,
  type TEXT NOT NULL DEFAULT 'announcement',
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'pending',
  subject TEXT,
  message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. platform_settings
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Seed initial platform settings
INSERT INTO platform_settings (key, value) VALUES
  ('branding', '{"name": "ClinicOS", "logo": ""}'),
  ('whatsapp_defaults', '{"retry_count": 3, "retry_delay_minutes": 5}'),
  ('feature_flags', '{"maintenance_mode": false, "allow_registration": true}')
ON CONFLICT (key) DO NOTHING;

-- Seed notification_logs from real clinics with realistic data
INSERT INTO notification_logs (clinic_id, recipient, type, channel, status, subject, sent_at)
SELECT id, name, 'subscription_reminder', 'email', 'sent', 'Your subscription renews soon', NOW() - INTERVAL '2 days'
FROM clinics ORDER BY created_at LIMIT 3;

INSERT INTO notification_logs (clinic_id, recipient, type, channel, status, subject, sent_at)
SELECT id, name, 'payment_reminder', 'whatsapp', 'sent', 'Payment due in 3 days', NOW() - INTERVAL '1 day'
FROM clinics ORDER BY created_at OFFSET 1 LIMIT 2;

INSERT INTO notification_logs (clinic_id, recipient, type, channel, status, subject, sent_at)
SELECT id, name, 'system_update', 'email', 'failed', 'System maintenance completed', NOW() - INTERVAL '12 hours'
FROM clinics ORDER BY created_at OFFSET 2 LIMIT 1;

-- Seed support_tickets from real clinics
INSERT INTO support_tickets (clinic_id, user_id, subject, description, priority, status, created_at)
SELECT c.id, u.id, 'WhatsApp not sending messages', 'Messages are stuck in queue and not being delivered to patients', 'high', 'open', NOW() - INTERVAL '2 days'
FROM clinics c JOIN users u ON u.clinic_id = c.id AND u.is_super_admin = false
WHERE c.status = 'active' LIMIT 1;

INSERT INTO support_tickets (clinic_id, user_id, subject, description, priority, status, created_at)
SELECT c.id, u.id, 'Cannot add new staff member', 'Getting error when adding staff: "Maximum staff limit reached"', 'medium', 'in_progress', NOW() - INTERVAL '3 days'
FROM clinics c JOIN users u ON u.clinic_id = c.id AND u.is_super_admin = false
WHERE c.status = 'active' OFFSET 1 LIMIT 1;

INSERT INTO support_tickets (clinic_id, user_id, subject, description, priority, status, created_at)
SELECT c.id, u.id, 'Billing question about upgrade', 'Want to upgrade to Professional plan — is there a prorated charge?', 'low', 'open', NOW() - INTERVAL '4 days'
FROM clinics c JOIN users u ON u.clinic_id = c.id AND u.is_super_admin = false
WHERE c.status = 'active' OFFSET 2 LIMIT 1;

INSERT INTO support_tickets (clinic_id, user_id, subject, description, priority, status, created_at)
SELECT c.id, u.id, 'Patient import failed', 'CSV import of 250 patient records failed at row 153 with validation error', 'high', 'open', NOW() - INTERVAL '1 day'
FROM clinics c JOIN users u ON u.clinic_id = c.id AND u.is_super_admin = false
WHERE c.status = 'active' OFFSET 3 LIMIT 1;

INSERT INTO support_tickets (clinic_id, user_id, subject, description, priority, status, created_at)
SELECT c.id, u.id, 'Calendar not syncing', 'Appointment calendar stopped syncing with dashboard', 'medium', 'closed', NOW() - INTERVAL '5 days'
FROM clinics c JOIN users u ON u.clinic_id = c.id AND u.is_super_admin = false
WHERE c.status = 'active' OFFSET 4 LIMIT 1;

-- RLS policies
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_notification_logs" ON notification_logs
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "super_admin_all_support_tickets" ON support_tickets
  FOR ALL USING (public.is_super_admin());

CREATE POLICY "super_admin_all_platform_settings" ON platform_settings
  FOR ALL USING (public.is_super_admin());
