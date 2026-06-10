-- ClinicOS Migration 00003: Staff & Team Management
-- Adds staff invitation system and last login tracking

-- ********************************************
-- ADD last_login_at TO users
-- ********************************************
alter table "public"."users" add column if not exists "last_login_at" timestamptz;

-- ********************************************
-- TABLE: staff_invitations
-- ********************************************
create table if not exists "public"."staff_invitations" (
    "id"            uuid not null default gen_random_uuid() primary key,
    "clinic_id"     uuid not null references "public"."clinics"("id") on delete cascade,
    "email"         text not null,
    "role_id"       uuid not null references "public"."roles"("id") on delete cascade,
    "token"         text not null unique,
    "status"        text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
    "expires_at"    timestamptz not null,
    "created_at"    timestamptz not null default now(),
    "accepted_at"   timestamptz
);

-- ********************************************
-- INDEXES
-- ********************************************
create index if not exists "idx_staff_invitations_clinic_id" on "public"."staff_invitations" ("clinic_id");
create index if not exists "idx_staff_invitations_email" on "public"."staff_invitations" ("email");
create index if not exists "idx_staff_invitations_status" on "public"."staff_invitations" ("status");
create index if not exists "idx_staff_invitations_token" on "public"."staff_invitations" ("token");
create index if not exists "idx_users_last_login_at" on "public"."users" ("last_login_at");

-- ********************************************
-- ROW LEVEL SECURITY
-- ********************************************
alter table "public"."staff_invitations" enable row level security;

-- staff_invitations: users can view invitations for their own clinic
create policy "staff_invitations_select_same_clinic" on "public"."staff_invitations"
    for select using (
        clinic_id = public.get_user_clinic_id()
    );

-- staff_invitations: users can insert invitations for their own clinic
create policy "staff_invitations_insert_same_clinic" on "public"."staff_invitations"
    for insert with check (
        clinic_id = public.get_user_clinic_id()
    );

-- staff_invitations: users can update invitations for their own clinic
create policy "staff_invitations_update_same_clinic" on "public"."staff_invitations"
    for update using (
        clinic_id = public.get_user_clinic_id()
    ) with check (
        clinic_id = public.get_user_clinic_id()
    );
