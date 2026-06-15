-- ClinicOS Migration 00004: Appointment Management Module
-- Tables: appointments, appointment_status_history, appointment_notes

-- ********************************************
-- TABLE: appointments
-- ********************************************
create table if not exists "public"."appointments" (
    "id"                uuid not null default gen_random_uuid() primary key,
    "clinic_id"         uuid not null references "public"."clinics"("id") on delete cascade,
    "patient_name"      text not null,
    "patient_phone"     text,
    "doctor_id"         uuid not null references "public"."users"("id") on delete cascade,
    "created_by"        uuid not null references "public"."users"("id") on delete cascade,
    "appointment_date"  date not null,
    "start_time"        time without time zone not null,
    "end_time"          time without time zone not null,
    "reason"            text,
    "notes"             text,
    "status"            text not null default 'scheduled' check (status in ('scheduled','confirmed','arrived','in_progress','completed','cancelled','no_show')),
    "created_at"        timestamptz not null default now(),
    "updated_at"        timestamptz not null default now()
);

-- ********************************************
-- TABLE: appointment_status_history
-- ********************************************
create table if not exists "public"."appointment_status_history" (
    "id"              uuid not null default gen_random_uuid() primary key,
    "appointment_id"  uuid not null references "public"."appointments"("id") on delete cascade,
    "old_status"      text,
    "new_status"      text not null,
    "changed_by"      uuid not null references "public"."users"("id") on delete cascade,
    "created_at"      timestamptz not null default now()
);

-- ********************************************
-- TABLE: appointment_notes
-- ********************************************
create table if not exists "public"."appointment_notes" (
    "id"              uuid not null default gen_random_uuid() primary key,
    "appointment_id"  uuid not null references "public"."appointments"("id") on delete cascade,
    "author_id"       uuid not null references "public"."users"("id") on delete cascade,
    "content"         text not null,
    "created_at"      timestamptz not null default now()
);

-- ********************************************
-- INDEXES
-- ********************************************
create index if not exists "idx_appointments_clinic_id" on "public"."appointments" ("clinic_id");
create index if not exists "idx_appointments_doctor_id" on "public"."appointments" ("doctor_id");
create index if not exists "idx_appointments_date" on "public"."appointments" ("appointment_date");
create index if not exists "idx_appointments_status" on "public"."appointments" ("status");
create index if not exists "idx_appointments_patient_name" on "public"."appointments" ("patient_name");
create index if not exists "idx_appointments_created_by" on "public"."appointments" ("created_by");
create index if not exists "idx_appointment_status_history_appointment_id" on "public"."appointment_status_history" ("appointment_id");
create index if not exists "idx_appointment_notes_appointment_id" on "public"."appointment_notes" ("appointment_id");

-- ********************************************
-- ROW LEVEL SECURITY
-- ********************************************
alter table "public"."appointments" enable row level security;
alter table "public"."appointment_status_history" enable row level security;
alter table "public"."appointment_notes" enable row level security;

drop policy if exists "appointments_select_same_clinic" on "public"."appointments";
create policy "appointments_select_same_clinic" on "public"."appointments"
    for select using (
        clinic_id = public.get_user_clinic_id()
    );

drop policy if exists "appointments_insert_same_clinic" on "public"."appointments";
create policy "appointments_insert_same_clinic" on "public"."appointments"
    for insert with check (
        clinic_id = public.get_user_clinic_id()
    );

drop policy if exists "appointments_update_same_clinic" on "public"."appointments";
create policy "appointments_update_same_clinic" on "public"."appointments"
    for update using (
        clinic_id = public.get_user_clinic_id()
    ) with check (
        clinic_id = public.get_user_clinic_id()
    );

drop policy if exists "appointments_delete_same_clinic" on "public"."appointments";
create policy "appointments_delete_same_clinic" on "public"."appointments"
    for delete using (
        clinic_id = public.get_user_clinic_id()
    );

drop policy if exists "status_history_select_same_clinic" on "public"."appointment_status_history";
create policy "status_history_select_same_clinic" on "public"."appointment_status_history"
    for select using (
        appointment_id in (
            select id from public.appointments where clinic_id = public.get_user_clinic_id()
        )
    );

drop policy if exists "status_history_insert_same_clinic" on "public"."appointment_status_history";
create policy "status_history_insert_same_clinic" on "public"."appointment_status_history"
    for insert with check (
        appointment_id in (
            select id from public.appointments where clinic_id = public.get_user_clinic_id()
        )
    );

drop policy if exists "notes_select_same_clinic" on "public"."appointment_notes";
create policy "notes_select_same_clinic" on "public"."appointment_notes"
    for select using (
        appointment_id in (
            select id from public.appointments where clinic_id = public.get_user_clinic_id()
        )
    );

drop policy if exists "notes_insert_same_clinic" on "public"."appointment_notes";
create policy "notes_insert_same_clinic" on "public"."appointment_notes"
    for insert with check (
        appointment_id in (
            select id from public.appointments where clinic_id = public.get_user_clinic_id()
        )
    );
