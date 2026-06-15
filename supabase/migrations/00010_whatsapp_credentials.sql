-- ClinicOS Migration 00010: WhatsApp Credentials & Scheduler Support
-- Tables: whatsapp_credentials
-- Functions: trigger_auto_updated_at, schedule_reminders (pg_cron)

-- ********************************************
-- TABLE: whatsapp_credentials
-- Per-clinic Meta WhatsApp Cloud API credentials
-- ********************************************
create table if not exists "public"."whatsapp_credentials" (
    "id"                    uuid not null default gen_random_uuid() primary key,
    "clinic_id"             uuid not null references "public"."clinics"("id") on delete cascade unique,
    "access_token"          text not null,
    "phone_number_id"       text not null,
    "business_account_id"   text,
    "webhook_verify_token"  text,
    "api_version"           text not null default 'v22.0',
    "is_connected"          boolean not null default false,
    "last_health_check_at"  timestamptz,
    "health_check_passed"   boolean,
    "created_at"            timestamptz not null default now(),
    "updated_at"            timestamptz not null default now()
);

-- ********************************************
-- INDEXES
-- ********************************************
create index if not exists "idx_whatsapp_credentials_clinic_id" on "public"."whatsapp_credentials" ("clinic_id");

-- ********************************************
-- ROW LEVEL SECURITY
-- ********************************************
alter table "public"."whatsapp_credentials" enable row level security;

drop policy if exists "credentials_select_same_clinic" on "public"."whatsapp_credentials";
create policy "credentials_select_same_clinic" on "public"."whatsapp_credentials"
    for select using (clinic_id = public.get_user_clinic_id());

drop policy if exists "credentials_insert_same_clinic" on "public"."whatsapp_credentials";
create policy "credentials_insert_same_clinic" on "public"."whatsapp_credentials"
    for insert with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "credentials_update_same_clinic" on "public"."whatsapp_credentials";
create policy "credentials_update_same_clinic" on "public"."whatsapp_credentials"
    for update using (clinic_id = public.get_user_clinic_id()) with check (clinic_id = public.get_user_clinic_id());

drop policy if exists "credentials_delete_same_clinic" on "public"."whatsapp_credentials";
create policy "credentials_delete_same_clinic" on "public"."whatsapp_credentials"
    for delete using (clinic_id = public.get_user_clinic_id());

-- ********************************************
-- AUTO-UPDATED AT TRIGGER
-- ********************************************
create or replace function public.whatsapp_credentials_auto_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists "trg_whatsapp_credentials_updated_at" on "public"."whatsapp_credentials";
create trigger "trg_whatsapp_credentials_updated_at"
    before update on "public"."whatsapp_credentials"
    for each row execute function public.whatsapp_credentials_auto_updated_at();

-- ********************************************
-- GRANT PERMISSIONS
-- ********************************************
grant all on "public"."whatsapp_credentials" to "authenticated", "anon", "service_role";
