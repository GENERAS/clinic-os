-- ClinicOS Initial Schema
-- Multi-tenant clinic management system

-- ********************************************
-- EXTENSIONS
-- ********************************************
create extension if not exists "pgcrypto" with schema "extensions";

-- ********************************************
-- TABLE: clinics
-- ********************************************
create table if not exists "public"."clinics" (
    "id"            uuid not null default gen_random_uuid() primary key,
    "name"          text not null,
    "slug"          text not null unique,
    "phone"         text,
    "email"         text,
    "address"       text,
    "logo_url"      text,
    "status"        text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
    "created_at"    timestamptz not null default now(),
    "updated_at"    timestamptz not null default now()
);

-- ********************************************
-- TABLE: users
-- ********************************************
create table if not exists "public"."users" (
    "id"            uuid not null default gen_random_uuid() primary key,
    "clinic_id"     uuid not null references "public"."clinics"("id") on delete cascade,
    "full_name"     text not null,
    "email"         text not null unique,
    "phone"         text,
    "avatar_url"    text,
    "status"        text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
    "created_at"    timestamptz not null default now(),
    "updated_at"    timestamptz not null default now()
);

-- ********************************************
-- TABLE: roles
-- ********************************************
create table if not exists "public"."roles" (
    "id"            uuid not null default gen_random_uuid() primary key,
    "name"          text not null unique,
    "description"   text,
    "created_at"    timestamptz not null default now()
);

-- ********************************************
-- TABLE: permissions
-- ********************************************
create table if not exists "public"."permissions" (
    "id"            uuid not null default gen_random_uuid() primary key,
    "name"          text not null unique,
    "description"   text,
    "created_at"    timestamptz not null default now()
);

-- ********************************************
-- TABLE: user_roles (many-to-many)
-- ********************************************
create table if not exists "public"."user_roles" (
    "id"            uuid not null default gen_random_uuid() primary key,
    "user_id"       uuid not null references "public"."users"("id") on delete cascade,
    "role_id"       uuid not null references "public"."roles"("id") on delete cascade,
    constraint "user_roles_unique" unique ("user_id", "role_id")
);

-- ********************************************
-- TABLE: role_permissions (many-to-many)
-- ********************************************
create table if not exists "public"."role_permissions" (
    "id"            uuid not null default gen_random_uuid() primary key,
    "role_id"       uuid not null references "public"."roles"("id") on delete cascade,
    "permission_id" uuid not null references "public"."permissions"("id") on delete cascade,
    constraint "role_permissions_unique" unique ("role_id", "permission_id")
);

-- ********************************************
-- TABLE: audit_logs
-- ********************************************
create table if not exists "public"."audit_logs" (
    "id"            uuid not null default gen_random_uuid() primary key,
    "clinic_id"     uuid not null references "public"."clinics"("id") on delete cascade,
    "user_id"       uuid references "public"."users"("id") on delete set null,
    "action"        text not null,
    "entity_type"   text not null,
    "entity_id"     uuid,
    "old_value"     jsonb,
    "new_value"     jsonb,
    "ip_address"    text,
    "created_at"    timestamptz not null default now()
);

-- ********************************************
-- TABLE: notifications
-- ********************************************
create table if not exists "public"."notifications" (
    "id"            uuid not null default gen_random_uuid() primary key,
    "clinic_id"     uuid not null references "public"."clinics"("id") on delete cascade,
    "user_id"       uuid references "public"."users"("id") on delete cascade,
    "title"         text not null,
    "message"       text,
    "type"          text default 'info' check (type in ('info', 'warning', 'success', 'error')),
    "is_read"       boolean not null default false,
    "created_at"    timestamptz not null default now()
);

-- ********************************************
-- INDEXES
-- ********************************************

-- clinics
create index if not exists "idx_clinics_slug" on "public"."clinics" ("slug");
create index if not exists "idx_clinics_email" on "public"."clinics" ("email");
create index if not exists "idx_clinics_status" on "public"."clinics" ("status");

-- users
create index if not exists "idx_users_clinic_id" on "public"."users" ("clinic_id");
create index if not exists "idx_users_email" on "public"."users" ("email");
create index if not exists "idx_users_phone" on "public"."users" ("phone");
create index if not exists "idx_users_status" on "public"."users" ("status");

-- user_roles
create index if not exists "idx_user_roles_user_id" on "public"."user_roles" ("user_id");
create index if not exists "idx_user_roles_role_id" on "public"."user_roles" ("role_id");

-- role_permissions
create index if not exists "idx_role_permissions_role_id" on "public"."role_permissions" ("role_id");
create index if not exists "idx_role_permissions_permission_id" on "public"."role_permissions" ("permission_id");

-- audit_logs
create index if not exists "idx_audit_logs_clinic_id" on "public"."audit_logs" ("clinic_id");
create index if not exists "idx_audit_logs_user_id" on "public"."audit_logs" ("user_id");
create index if not exists "idx_audit_logs_entity_type" on "public"."audit_logs" ("entity_type");
create index if not exists "idx_audit_logs_created_at" on "public"."audit_logs" ("created_at");

-- notifications
create index if not exists "idx_notifications_clinic_id" on "public"."notifications" ("clinic_id");
create index if not exists "idx_notifications_user_id" on "public"."notifications" ("user_id");
create index if not exists "idx_notifications_is_read" on "public"."notifications" ("is_read");
create index if not exists "idx_notifications_created_at" on "public"."notifications" ("created_at");

-- ********************************************
-- ROW LEVEL SECURITY
-- ********************************************

-- Enable RLS on all tables
alter table "public"."clinics" enable row level security;
alter table "public"."users" enable row level security;
alter table "public"."roles" enable row level security;
alter table "public"."permissions" enable row level security;
alter table "public"."user_roles" enable row level security;
alter table "public"."role_permissions" enable row level security;
alter table "public"."audit_logs" enable row level security;
alter table "public"."notifications" enable row level security;

-- Helper function: get current user's clinic_id
create or replace function "public"."get_user_clinic_id"()
returns uuid
language sql
stable
as $$
    select clinic_id from public.users where id = auth.uid()
$$;

-- clinics: users can only view their own clinic
create policy "clinics_select_own" on "public"."clinics"
    for select using (
        id = public.get_user_clinic_id()
    );

-- users: users can view others in the same clinic
create policy "users_select_same_clinic" on "public"."users"
    for select using (
        clinic_id = public.get_user_clinic_id()
    );

-- users: users can update their own record
create policy "users_update_own" on "public"."users"
    for update using (
        id = auth.uid()
    ) with check (
        id = auth.uid()
    );

-- roles: authenticated users can view roles
create policy "roles_select_authenticated" on "public"."roles"
    for select using (
        auth.role() = 'authenticated'
    );

-- permissions: authenticated users can view permissions
create policy "permissions_select_authenticated" on "public"."permissions"
    for select using (
        auth.role() = 'authenticated'
    );

-- user_roles: users can view roles within their clinic's users
create policy "user_roles_select_same_clinic" on "public"."user_roles"
    for select using (
        user_id in (
            select id from public.users where clinic_id = public.get_user_clinic_id()
        )
    );

-- role_permissions: authenticated users can view
create policy "role_permissions_select_authenticated" on "public"."role_permissions"
    for select using (
        auth.role() = 'authenticated'
    );

-- audit_logs: users can view logs within their clinic
create policy "audit_logs_select_same_clinic" on "public"."audit_logs"
    for select using (
        clinic_id = public.get_user_clinic_id()
    );

-- audit_logs: authenticated users can insert logs
create policy "audit_logs_insert_authenticated" on "public"."audit_logs"
    for insert with check (
        clinic_id = public.get_user_clinic_id()
    );

-- notifications: users can view notifications within their clinic
create policy "notifications_select_same_clinic" on "public"."notifications"
    for select using (
        clinic_id = public.get_user_clinic_id()
    );

-- notifications: users can mark notifications as read
create policy "notifications_update_own" on "public"."notifications"
    for update using (
        clinic_id = public.get_user_clinic_id()
    ) with check (
        clinic_id = public.get_user_clinic_id()
    );
