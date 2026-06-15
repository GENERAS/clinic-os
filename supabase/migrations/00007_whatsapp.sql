-- ClinicOS Migration 00007: WhatsApp Integration & Appointment Reminders
-- Tables: whatsapp_messages, whatsapp_templates
-- Extends: clinic_notification_settings

-- ********************************************
-- EXTEND clinic_notification_settings
-- ********************************************
alter table "public"."clinic_notification_settings" add column if not exists "whatsapp_reminders_enabled" boolean not null default true;
alter table "public"."clinic_notification_settings" add column if not exists "reminder_hours_before" integer not null default 24;

-- ********************************************
-- TABLE: whatsapp_templates
-- ********************************************
create table if not exists "public"."whatsapp_templates" (
    "id"              uuid not null default gen_random_uuid() primary key,
    "clinic_id"       uuid not null references "public"."clinics"("id") on delete cascade,
    "name"            text not null,
    "template_type"   text not null check (template_type in ('appointment_reminder', 'appointment_confirmation', 'system_notification')),
    "content"         text not null,
    "is_active"       boolean not null default true,
    "created_at"      timestamptz not null default now(),
    "updated_at"      timestamptz not null default now()
);

-- ********************************************
-- TABLE: whatsapp_messages
-- ********************************************
create table if not exists "public"."whatsapp_messages" (
    "id"                 uuid not null default gen_random_uuid() primary key,
    "clinic_id"          uuid not null references "public"."clinics"("id") on delete cascade,
    "patient_id"         uuid references "public"."patients"("id") on delete set null,
    "appointment_id"     uuid references "public"."appointments"("id") on delete set null,
    "phone_number"       text not null,
    "message_type"       text not null check (message_type in ('appointment_reminder', 'appointment_confirmation', 'system_notification')),
    "message_template"   text not null,
    "message_content"    text not null,
    "provider"           text not null default 'meta',
    "provider_message_id" text,
    "status"             text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
    "sent_at"            timestamptz,
    "delivered_at"       timestamptz,
    "read_at"            timestamptz,
    "failed_at"          timestamptz,
    "error_message"      text,
    "created_at"         timestamptz not null default now()
);

-- ********************************************
-- INDEXES
-- ********************************************
create index if not exists "idx_whatsapp_messages_clinic_id" on "public"."whatsapp_messages" ("clinic_id");
create index if not exists "idx_whatsapp_messages_appointment" on "public"."whatsapp_messages" ("appointment_id");
create index if not exists "idx_whatsapp_messages_status" on "public"."whatsapp_messages" ("status");
create index if not exists "idx_whatsapp_messages_created" on "public"."whatsapp_messages" ("created_at");
create index if not exists "idx_whatsapp_messages_provider_id" on "public"."whatsapp_messages" ("provider_message_id");
create index if not exists "idx_whatsapp_templates_clinic_id" on "public"."whatsapp_templates" ("clinic_id");
create index if not exists "idx_whatsapp_templates_type" on "public"."whatsapp_templates" ("template_type");

-- For duplicate prevention: one reminder per appointment per type
create unique index if not exists "idx_whatsapp_messages_dedup" on "public"."whatsapp_messages" ("appointment_id", "message_type") where appointment_id is not null;

-- ********************************************
-- ROW LEVEL SECURITY
-- ********************************************
alter table "public"."whatsapp_templates" enable row level security;
alter table "public"."whatsapp_messages" enable row level security;

drop policy if exists "templates_select_same_clinic" on "public"."whatsapp_templates";
create policy "templates_select_same_clinic" on "public"."whatsapp_templates"
    for select using (clinic_id = public.get_user_clinic_id());

drop policy if exists "templates_insert_same_clinic" on "public"."whatsapp_templates";
create policy "templates_insert_same_clinic" on "public"."whatsapp_templates"
    for insert with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "templates_update_same_clinic" on "public"."whatsapp_templates";
create policy "templates_update_same_clinic" on "public"."whatsapp_templates"
    for update using (clinic_id = public.get_user_clinic_id()) with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "templates_delete_same_clinic" on "public"."whatsapp_templates";
create policy "templates_delete_same_clinic" on "public"."whatsapp_templates"
    for delete using (clinic_id = public.get_user_clinic_id());

drop policy if exists "messages_select_same_clinic" on "public"."whatsapp_messages";
create policy "messages_select_same_clinic" on "public"."whatsapp_messages"
    for select using (clinic_id = public.get_user_clinic_id());

drop policy if exists "messages_insert_same_clinic" on "public"."whatsapp_messages";
create policy "messages_insert_same_clinic" on "public"."whatsapp_messages"
    for insert with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "messages_update_same_clinic" on "public"."whatsapp_messages";
create policy "messages_update_same_clinic" on "public"."whatsapp_messages"
    for update using (clinic_id = public.get_user_clinic_id()) with check (clinic_id = public.get_user_clinic_id());
