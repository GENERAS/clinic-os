-- =============================================================
-- 00019_whatsapp_v2.sql
-- WhatsApp Communication Engine v2
-- Tables: whatsapp_settings, whatsapp_templates (enhanced),
--         whatsapp_messages (enhanced), whatsapp_conversations,
--         whatsapp_surveys, whatsapp_medication_reminders,
--         whatsapp_follow_ups
-- =============================================================

-- ********************************************
-- TABLE: whatsapp_settings
-- Per-clinic settings + simulation/production mode
-- ********************************************
create table if not exists "public"."whatsapp_settings" (
    "id"                    uuid not null default gen_random_uuid() primary key,
    "clinic_id"             uuid not null references "public"."clinics"("id") on delete cascade unique,
    "business_name"         text,
    "phone_number"          text,
    "phone_number_id"       text,
    "business_account_id"   text,
    "access_token"          text,
    "verify_token"          text,
    "api_mode"              text not null default 'simulation' check (api_mode in ('simulation', 'production')),
    "connection_status"     text not null default 'disconnected' check (connection_status in ('disconnected', 'connecting', 'connected', 'error')),
    "connected_at"          timestamptz,
    "reminders_enabled"     boolean not null default false,
    "reminder_hours"        integer[] not null default '{24,3}',
    "follow_up_enabled"     boolean not null default false,
    "follow_up_days"        integer[] not null default '{1,3,7}',
    "survey_enabled"        boolean not null default false,
    "created_at"            timestamptz not null default now(),
    "updated_at"            timestamptz not null default now()
);

-- ********************************************
-- TABLE: whatsapp_templates (enhanced with default templates)
-- ********************************************
alter table if exists "public"."whatsapp_templates" add column if not exists "is_default" boolean not null default false;
alter table if exists "public"."whatsapp_templates" add column if not exists "template_type" text;
alter table if exists "public"."whatsapp_templates" alter column "template_type" set default 'appointment_reminder';

-- ********************************************
-- TABLE: whatsapp_messages (enhanced with direction, read tracking)
-- ********************************************
alter table if exists "public"."whatsapp_messages" add column if not exists "direction" text not null default 'outbound' check (direction in ('inbound', 'outbound'));
alter table if exists "public"."whatsapp_messages" add column if not exists "provider_message_id" text;
alter table if exists "public"."whatsapp_messages" add column if not exists "conversation_id" uuid;

-- ********************************************
-- TABLE: whatsapp_conversations
-- Tracks patient WhatsApp sessions (booking, reschedule, etc.)
-- ********************************************
create table if not exists "public"."whatsapp_conversations" (
    "id"                    uuid not null default gen_random_uuid() primary key,
    "clinic_id"             uuid not null references "public"."clinics"("id") on delete cascade,
    "patient_id"            uuid references "public"."patients"("id") on delete set null,
    "phone_number"          text not null,
    "session_status"        text not null default 'active' check (session_status in ('active', 'completed', 'expired')),
    "conversation_type"     text check (conversation_type in ('booking', 'reschedule', 'cancel', 'info', 'survey', 'general')),
    "current_step"          text,
    "context"               jsonb default '{}'::jsonb,
    "started_at"            timestamptz not null default now(),
    "ended_at"              timestamptz,
    "created_at"            timestamptz not null default now(),
    "updated_at"            timestamptz not null default now()
);

-- ********************************************
-- TABLE: whatsapp_surveys
-- Patient satisfaction ratings after appointments
-- ********************************************
create table if not exists "public"."whatsapp_surveys" (
    "id"                    uuid not null default gen_random_uuid() primary key,
    "clinic_id"             uuid not null references "public"."clinics"("id") on delete cascade,
    "patient_id"            uuid not null references "public"."patients"("id") on delete cascade,
    "appointment_id"        uuid references "public"."appointments"("id") on delete set null,
    "rating"                integer check (rating >= 1 and rating <= 5),
    "feedback"              text,
    "sent_at"               timestamptz,
    "responded_at"          timestamptz,
    "created_at"            timestamptz not null default now()
);

-- ********************************************
-- TABLE: whatsapp_medication_reminders
-- Doctor-prescribed medication reminders
-- ********************************************
create table if not exists "public"."whatsapp_medication_reminders" (
    "id"                    uuid not null default gen_random_uuid() primary key,
    "clinic_id"             uuid not null references "public"."clinics"("id") on delete cascade,
    "patient_id"            uuid not null references "public"."patients"("id") on delete cascade,
    "medicine"              text not null,
    "dosage"                text not null,
    "frequency"             text not null,
    "duration_days"         integer,
    "start_date"            date not null,
    "end_date"              date,
    "is_active"             boolean not null default true,
    "created_by"            uuid references "public"."users"("id") on delete set null,
    "created_at"            timestamptz not null default now(),
    "updated_at"            timestamptz not null default now()
);

-- ********************************************
-- TABLE: whatsapp_follow_ups
-- Automated follow-up schedule after appointments
-- ********************************************
create table if not exists "public"."whatsapp_follow_ups" (
    "id"                    uuid not null default gen_random_uuid() primary key,
    "clinic_id"             uuid not null references "public"."clinics"("id") on delete cascade,
    "patient_id"            uuid not null references "public"."patients"("id") on delete cascade,
    "appointment_id"        uuid references "public"."appointments"("id") on delete set null,
    "scheduled_for"         timestamptz not null,
    "sent_at"              timestamptz,
    "status"               text not null default 'pending' check (status in ('pending', 'sent', 'skipped')),
    "follow_up_type"       text not null default 'check_in' check (follow_up_type in ('check_in', 'medication', 'survey')),
    "created_at"           timestamptz not null default now()
);

-- ********************************************
-- INDEXES
-- ********************************************
create index if not exists "idx_whatsapp_settings_clinic_id" on "public"."whatsapp_settings" ("clinic_id");
create index if not exists "idx_whatsapp_conversations_clinic_id" on "public"."whatsapp_conversations" ("clinic_id");
create index if not exists "idx_whatsapp_conversations_patient_id" on "public"."whatsapp_conversations" ("patient_id");
create index if not exists "idx_whatsapp_conversations_phone" on "public"."whatsapp_conversations" ("phone_number");
create index if not exists "idx_whatsapp_surveys_clinic_id" on "public"."whatsapp_surveys" ("clinic_id");
create index if not exists "idx_whatsapp_medication_clinic_id" on "public"."whatsapp_medication_reminders" ("clinic_id");
create index if not exists "idx_whatsapp_medication_patient_id" on "public"."whatsapp_medication_reminders" ("patient_id");
create index if not exists "idx_whatsapp_follow_ups_clinic_id" on "public"."whatsapp_follow_ups" ("clinic_id");
create index if not exists "idx_whatsapp_messages_direction" on "public"."whatsapp_messages" ("direction");

-- ********************************************
-- ROW LEVEL SECURITY
-- ********************************************
alter table "public"."whatsapp_settings" enable row level security;
alter table "public"."whatsapp_conversations" enable row level security;
alter table "public"."whatsapp_surveys" enable row level security;
alter table "public"."whatsapp_medication_reminders" enable row level security;
alter table "public"."whatsapp_follow_ups" enable row level security;

drop policy if exists "settings_select_same_clinic" on "public"."whatsapp_settings";
create policy "settings_select_same_clinic" on "public"."whatsapp_settings"
    for select using (clinic_id = public.get_user_clinic_id());

drop policy if exists "settings_insert_same_clinic" on "public"."whatsapp_settings";
create policy "settings_insert_same_clinic" on "public"."whatsapp_settings"
    for insert with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "settings_update_same_clinic" on "public"."whatsapp_settings";
create policy "settings_update_same_clinic" on "public"."whatsapp_settings"
    for update using (clinic_id = public.get_user_clinic_id()) with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "conversations_select_same_clinic" on "public"."whatsapp_conversations";
create policy "conversations_select_same_clinic" on "public"."whatsapp_conversations"
    for select using (clinic_id = public.get_user_clinic_id());

drop policy if exists "conversations_insert_same_clinic" on "public"."whatsapp_conversations";
create policy "conversations_insert_same_clinic" on "public"."whatsapp_conversations"
    for insert with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "conversations_update_same_clinic" on "public"."whatsapp_conversations";
create policy "conversations_update_same_clinic" on "public"."whatsapp_conversations"
    for update using (clinic_id = public.get_user_clinic_id()) with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "surveys_select_same_clinic" on "public"."whatsapp_surveys";
create policy "surveys_select_same_clinic" on "public"."whatsapp_surveys"
    for select using (clinic_id = public.get_user_clinic_id());

drop policy if exists "surveys_insert_same_clinic" on "public"."whatsapp_surveys";
create policy "surveys_insert_same_clinic" on "public"."whatsapp_surveys"
    for insert with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "medication_select_same_clinic" on "public"."whatsapp_medication_reminders";
create policy "medication_select_same_clinic" on "public"."whatsapp_medication_reminders"
    for select using (clinic_id = public.get_user_clinic_id());

drop policy if exists "medication_insert_same_clinic" on "public"."whatsapp_medication_reminders";
create policy "medication_insert_same_clinic" on "public"."whatsapp_medication_reminders"
    for insert with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "follow_ups_select_same_clinic" on "public"."whatsapp_follow_ups";
create policy "follow_ups_select_same_clinic" on "public"."whatsapp_follow_ups"
    for select using (clinic_id = public.get_user_clinic_id());

drop policy if exists "follow_ups_insert_same_clinic" on "public"."whatsapp_follow_ups";
create policy "follow_ups_insert_same_clinic" on "public"."whatsapp_follow_ups"
    for insert with check (clinic_id = public.get_user_clinic_id());

-- ********************************************
-- DEFAULT TEMPLATES (inserted per-clinic via app)
-- ********************************************
-- Templates are created programmatically by the app. No static inserts.

-- ********************************************
-- GRANT PERMISSIONS
-- ********************************************
grant all on "public"."whatsapp_settings" to "authenticated", "service_role";
grant all on "public"."whatsapp_conversations" to "authenticated", "service_role";
grant all on "public"."whatsapp_surveys" to "authenticated", "service_role";
grant all on "public"."whatsapp_medication_reminders" to "authenticated", "service_role";
grant all on "public"."whatsapp_follow_ups" to "authenticated", "service_role";
