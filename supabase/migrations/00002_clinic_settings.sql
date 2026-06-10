-- ClinicOS Migration 00002: Clinic Settings Module
-- Adds new columns to clinics table and creates supporting tables for clinic settings

-- ********************************************
-- ADD NEW COLUMNS TO clinics
-- ********************************************
alter table "public"."clinics" add column if not exists "alternative_phone" text;
alter table "public"."clinics" add column if not exists "website" text;
alter table "public"."clinics" add column if not exists "description" text;
alter table "public"."clinics" add column if not exists "country" text;
alter table "public"."clinics" add column if not exists "city" text;
alter table "public"."clinics" add column if not exists "timezone" text not null default 'UTC';

-- ********************************************
-- TABLE: clinic_operating_hours
-- ********************************************
create table if not exists "public"."clinic_operating_hours" (
    "id"            uuid not null default gen_random_uuid() primary key,
    "clinic_id"     uuid not null references "public"."clinics"("id") on delete cascade,
    "day_of_week"   integer not null check (day_of_week between 0 and 6),
    "is_open"       boolean not null default true,
    "open_time"     time without time zone not null default '08:00',
    "close_time"    time without time zone not null default '17:00',
    "created_at"    timestamptz not null default now(),
    constraint "clinic_operating_hours_unique" unique ("clinic_id", "day_of_week")
);

-- ********************************************
-- TABLE: clinic_preferences
-- ********************************************
create table if not exists "public"."clinic_preferences" (
    "id"            uuid not null default gen_random_uuid() primary key,
    "clinic_id"     uuid not null references "public"."clinics"("id") on delete cascade unique,
    "currency"      text not null default 'RWF',
    "date_format"   text not null default 'DD/MM/YYYY',
    "time_format"   text not null default '24h',
    "language"      text not null default 'en',
    "created_at"    timestamptz not null default now(),
    "updated_at"    timestamptz not null default now()
);

-- ********************************************
-- TABLE: clinic_notification_settings
-- ********************************************
create table if not exists "public"."clinic_notification_settings" (
    "id"                            uuid not null default gen_random_uuid() primary key,
    "clinic_id"                     uuid not null references "public"."clinics"("id") on delete cascade unique,
    "appointment_reminders_enabled" boolean not null default true,
    "low_stock_alerts_enabled"      boolean not null default true,
    "system_notifications_enabled"  boolean not null default true,
    "created_at"                    timestamptz not null default now(),
    "updated_at"                    timestamptz not null default now()
);

-- ********************************************
-- INDEXES
-- ********************************************
create index if not exists "idx_clinic_operating_hours_clinic_id" on "public"."clinic_operating_hours" ("clinic_id");
create index if not exists "idx_clinic_preferences_clinic_id" on "public"."clinic_preferences" ("clinic_id");
create index if not exists "idx_clinic_notification_settings_clinic_id" on "public"."clinic_notification_settings" ("clinic_id");

-- ********************************************
-- ROW LEVEL SECURITY
-- ********************************************
alter table "public"."clinic_operating_hours" enable row level security;
alter table "public"."clinic_preferences" enable row level security;
alter table "public"."clinic_notification_settings" enable row level security;

-- clinic_operating_hours: users can only access their own clinic's hours
create policy "operating_hours_select_same_clinic" on "public"."clinic_operating_hours"
    for select using (
        clinic_id = public.get_user_clinic_id()
    );

create policy "operating_hours_insert_same_clinic" on "public"."clinic_operating_hours"
    for insert with check (
        clinic_id = public.get_user_clinic_id()
    );

create policy "operating_hours_update_same_clinic" on "public"."clinic_operating_hours"
    for update using (
        clinic_id = public.get_user_clinic_id()
    ) with check (
        clinic_id = public.get_user_clinic_id()
    );

create policy "operating_hours_delete_same_clinic" on "public"."clinic_operating_hours"
    for delete using (
        clinic_id = public.get_user_clinic_id()
    );

-- clinic_preferences: users can only access their own clinic's preferences
create policy "preferences_select_same_clinic" on "public"."clinic_preferences"
    for select using (
        clinic_id = public.get_user_clinic_id()
    );

create policy "preferences_insert_same_clinic" on "public"."clinic_preferences"
    for insert with check (
        clinic_id = public.get_user_clinic_id()
    );

create policy "preferences_update_same_clinic" on "public"."clinic_preferences"
    for update using (
        clinic_id = public.get_user_clinic_id()
    ) with check (
        clinic_id = public.get_user_clinic_id()
    );

-- clinic_notification_settings: users can only access their own clinic's notification settings
create policy "notification_settings_select_same_clinic" on "public"."clinic_notification_settings"
    for select using (
        clinic_id = public.get_user_clinic_id()
    );

create policy "notification_settings_insert_same_clinic" on "public"."clinic_notification_settings"
    for insert with check (
        clinic_id = public.get_user_clinic_id()
    );

create policy "notification_settings_update_same_clinic" on "public"."clinic_notification_settings"
    for update using (
        clinic_id = public.get_user_clinic_id()
    ) with check (
        clinic_id = public.get_user_clinic_id()
    );

-- ********************************************
-- DEFAULT DATA: insert default preferences and notification settings for existing clinics
-- ********************************************
insert into "public"."clinic_preferences" ("clinic_id")
select "id" from "public"."clinics"
on conflict ("clinic_id") do nothing;

insert into "public"."clinic_notification_settings" ("clinic_id")
select "id" from "public"."clinics"
on conflict ("clinic_id") do nothing;
