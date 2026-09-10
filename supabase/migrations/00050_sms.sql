-- ClinicOS Migration 00050: SMS messaging
-- Adds: sms_credentials (per-clinic SMS provider config),
--       SMS reminder settings on clinic_notification_settings,
--       per-provider dedup so WhatsApp + SMS reminders can coexist.

-- ********************************************
-- TABLE: sms_credentials
-- Provider config per clinic. Secrets are stored server-side only
-- (edge function `send-sms` reads them with the service role).
-- ********************************************
create table if not exists "public"."sms_credentials" (
    "id"                  uuid not null default gen_random_uuid() primary key,
    "clinic_id"           uuid not null references "public"."clinics"("id") on delete cascade unique,
    "provider"            text not null default 'africastalking' check (provider in ('africastalking', 'twilio')),
    "sender_id"           text,
    "config"              jsonb not null default '{}'::jsonb,
    "is_enabled"          boolean not null default false,
    "connection_status"   text not null default 'disconnected' check (connection_status in ('disconnected', 'connected', 'error')),
    "connected_at"        timestamptz,
    "last_health_check_at" timestamptz,
    "health_check_passed" boolean,
    "created_at"          timestamptz not null default now(),
    "updated_at"          timestamptz not null default now()
);

-- ********************************************
-- EXTEND clinic_notification_settings
-- ********************************************
alter table "public"."clinic_notification_settings" add column if not exists "sms_reminders_enabled" boolean not null default false;
alter table "public"."clinic_notification_settings" add column if not exists "sms_reminder_hours_before" integer not null default 24;

-- ********************************************
-- Per-provider dedup: allow one reminder per appointment per provider
-- (previously one row per (appointment_id, message_type) total).
-- safe: old index guaranteed uniqueness on (appointment_id, message_type),
-- so (appointment_id, message_type, provider) is also unique in existing data.
-- ********************************************
drop index if exists "idx_whatsapp_messages_dedup";
create unique index if not exists "idx_whatsapp_messages_dedup" on "public"."whatsapp_messages" ("appointment_id", "message_type", "provider") where appointment_id is not null;

-- ********************************************
-- INDEXES
-- ********************************************
create index if not exists "idx_sms_credentials_clinic_id" on "public"."sms_credentials" ("clinic_id");

-- ********************************************
-- ROW LEVEL SECURITY
-- ********************************************
alter table "public"."sms_credentials" enable row level security;

drop policy if exists "sms_credentials_select_same_clinic" on "public"."sms_credentials";
create policy "sms_credentials_select_same_clinic" on "public"."sms_credentials"
    for select using (clinic_id = public.get_user_clinic_id());

drop policy if exists "sms_credentials_insert_same_clinic" on "public"."sms_credentials";
create policy "sms_credentials_insert_same_clinic" on "public"."sms_credentials"
    for insert with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "sms_credentials_update_same_clinic" on "public"."sms_credentials";
create policy "sms_credentials_update_same_clinic" on "public"."sms_credentials"
    for update using (clinic_id = public.get_user_clinic_id()) with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "sms_credentials_delete_same_clinic" on "public"."sms_credentials";
create policy "sms_credentials_delete_same_clinic" on "public"."sms_credentials"
    for delete using (clinic_id = public.get_user_clinic_id());

-- Super admin can manage all clinics' SMS credentials
create policy "super_admin_all_sms_credentials" on public.sms_credentials
    for all to authenticated
    using (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true))
    with check (exists (select 1 from public.users where id = auth.uid() and is_super_admin = true));

-- ********************************************
-- GRANTS
-- ********************************************
-- Authenticated users manage their own clinic's creds through RLS.
grant select, insert, update, delete on "public"."sms_credentials" to "authenticated";
grant all on "public"."sms_credentials" to "service_role";
-- Secrets must never be readable by anon (mirrors whatsapp_credentials hardening)
revoke all on "public"."sms_credentials" from "anon";