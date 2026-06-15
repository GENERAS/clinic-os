-- ClinicOS Migration 00005: Patient Management Module
-- Tables: patients, patient_notes
-- Adds patient_id to appointments for linking

-- ********************************************
-- TABLE: patients
-- ********************************************
create table if not exists "public"."patients" (
    "id"                      uuid not null default gen_random_uuid() primary key,
    "clinic_id"               uuid not null references "public"."clinics"("id") on delete cascade,
    "full_name"               text not null,
    "phone"                   text not null,
    "email"                   text,
    "gender"                  text check (gender in ('male', 'female', 'other')),
    "date_of_birth"           date,
    "address"                 text,
    "emergency_contact_name"  text,
    "emergency_contact_phone" text,
    "notes"                   text,
    "created_by"              uuid not null references "public"."users"("id") on delete cascade,
    "created_at"              timestamptz not null default now(),
    "updated_at"              timestamptz not null default now(),
    constraint "patients_clinic_phone_unique" unique ("clinic_id", "phone")
);

-- ********************************************
-- TABLE: patient_notes
-- ********************************************
create table if not exists "public"."patient_notes" (
    "id"          uuid not null default gen_random_uuid() primary key,
    "clinic_id"   uuid not null references "public"."clinics"("id") on delete cascade,
    "patient_id"  uuid not null references "public"."patients"("id") on delete cascade,
    "author_id"   uuid not null references "public"."users"("id") on delete cascade,
    "content"     text not null,
    "created_at"  timestamptz not null default now()
);

-- ********************************************
-- ADD patient_id TO appointments (optional link)
-- ********************************************
alter table "public"."appointments" add column if not exists "patient_id" uuid references "public"."patients"("id") on delete set null;

-- ********************************************
-- ENABLE PG_TRGM EXTENSION (for fuzzy search) — must be before GIN indexes
-- ********************************************
create extension if not exists "pg_trgm" with schema "extensions";

-- ********************************************
-- INDEXES
-- ********************************************
create index if not exists "idx_patients_clinic_id" on "public"."patients" ("clinic_id");
create index if not exists "idx_patients_phone" on "public"."patients" ("phone");
create index if not exists "idx_patients_name" on "public"."patients" ("full_name");
create index if not exists "idx_patients_name_trgm" on "public"."patients" using gin ("full_name" gin_trgm_ops);
create index if not exists "idx_patients_phone_trgm" on "public"."patients" using gin ("phone" gin_trgm_ops);
create index if not exists "idx_patient_notes_patient_id" on "public"."patient_notes" ("patient_id");
create index if not exists "idx_patient_notes_clinic_id" on "public"."patient_notes" ("clinic_id");
create index if not exists "idx_appointments_patient_id" on "public"."appointments" ("patient_id");

-- ********************************************
-- ROW LEVEL SECURITY
-- ********************************************
alter table "public"."patients" enable row level security;
alter table "public"."patient_notes" enable row level security;

drop policy if exists "patients_select_same_clinic" on "public"."patients";
create policy "patients_select_same_clinic" on "public"."patients"
    for select using (
        clinic_id = public.get_user_clinic_id()
    );

drop policy if exists "patients_insert_same_clinic" on "public"."patients";
create policy "patients_insert_same_clinic" on "public"."patients"
    for insert with check (
        clinic_id = public.get_user_clinic_id()
    );

drop policy if exists "patients_update_same_clinic" on "public"."patients";
create policy "patients_update_same_clinic" on "public"."patients"
    for update using (
        clinic_id = public.get_user_clinic_id()
    ) with check (
        clinic_id = public.get_user_clinic_id()
    );

drop policy if exists "patients_delete_same_clinic" on "public"."patients";
create policy "patients_delete_same_clinic" on "public"."patients"
    for delete using (
        clinic_id = public.get_user_clinic_id()
    );

drop policy if exists "patient_notes_select_same_clinic" on "public"."patient_notes";
create policy "patient_notes_select_same_clinic" on "public"."patient_notes"
    for select using (
        clinic_id = public.get_user_clinic_id()
    );

drop policy if exists "patient_notes_insert_same_clinic" on "public"."patient_notes";
create policy "patient_notes_insert_same_clinic" on "public"."patient_notes"
    for insert with check (
        clinic_id = public.get_user_clinic_id()
    );

