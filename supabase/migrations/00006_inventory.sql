-- ClinicOS Migration 00006: Inventory Management Module
-- Tables: inventory_categories, inventory_items, inventory_transactions

-- ********************************************
-- TABLE: inventory_categories
-- ********************************************
create table if not exists "public"."inventory_categories" (
    "id"          uuid not null default gen_random_uuid() primary key,
    "clinic_id"   uuid not null references "public"."clinics"("id") on delete cascade,
    "name"        text not null,
    "description" text,
    "created_at"  timestamptz not null default now(),
    constraint "inventory_categories_clinic_name_unique" unique ("clinic_id", "name")
);

-- ********************************************
-- TABLE: inventory_items
-- ********************************************
create table if not exists "public"."inventory_items" (
    "id"            uuid not null default gen_random_uuid() primary key,
    "clinic_id"     uuid not null references "public"."clinics"("id") on delete cascade,
    "category_id"   uuid references "public"."inventory_categories"("id") on delete set null,
    "name"          text not null,
    "unit"          text not null default 'piece',
    "current_stock" integer not null default 0 check (current_stock >= 0),
    "minimum_stock" integer not null default 0 check (minimum_stock >= 0),
    "description"   text,
    "created_by"    uuid not null references "public"."users"("id") on delete cascade,
    "created_at"    timestamptz not null default now(),
    "updated_at"    timestamptz not null default now()
);

-- ********************************************
-- TABLE: inventory_transactions
-- ********************************************
create table if not exists "public"."inventory_transactions" (
    "id"                uuid not null default gen_random_uuid() primary key,
    "clinic_id"         uuid not null references "public"."clinics"("id") on delete cascade,
    "inventory_item_id" uuid not null references "public"."inventory_items"("id") on delete cascade,
    "type"              text not null check (type in ('stock_in', 'stock_out', 'adjustment', 'expired')),
    "quantity"          integer not null check (quantity > 0),
    "previous_stock"    integer not null,
    "new_stock"         integer not null,
    "reason"            text,
    "performed_by"      uuid not null references "public"."users"("id") on delete cascade,
    "created_at"        timestamptz not null default now()
);

-- ********************************************
-- INDEXES
-- ********************************************
create index if not exists "idx_inventory_items_clinic_id" on "public"."inventory_items" ("clinic_id");
create index if not exists "idx_inventory_items_category" on "public"."inventory_items" ("category_id");
create index if not exists "idx_inventory_items_name" on "public"."inventory_items" ("name");
create index if not exists "idx_inventory_items_stock" on "public"."inventory_items" ("current_stock");
create index if not exists "idx_inventory_categories_clinic_id" on "public"."inventory_categories" ("clinic_id");
create index if not exists "idx_inventory_transactions_item" on "public"."inventory_transactions" ("inventory_item_id");
create index if not exists "idx_inventory_transactions_clinic_id" on "public"."inventory_transactions" ("clinic_id");
create index if not exists "idx_inventory_transactions_created" on "public"."inventory_transactions" ("created_at");

-- ********************************************
-- ROW LEVEL SECURITY
-- ********************************************
alter table "public"."inventory_categories" enable row level security;
alter table "public"."inventory_items" enable row level security;
alter table "public"."inventory_transactions" enable row level security;

-- Categories: users can only access their own clinic's categories
create policy "categories_select_same_clinic" on "public"."inventory_categories"
    for select using (clinic_id = public.get_user_clinic_id());

create policy "categories_insert_same_clinic" on "public"."inventory_categories"
    for insert with check (clinic_id = public.get_user_clinic_id());

create policy "categories_update_same_clinic" on "public"."inventory_categories"
    for update using (clinic_id = public.get_user_clinic_id()) with check (clinic_id = public.get_user_clinic_id());

create policy "categories_delete_same_clinic" on "public"."inventory_categories"
    for delete using (clinic_id = public.get_user_clinic_id());

-- Items: users can only access their own clinic's items
create policy "items_select_same_clinic" on "public"."inventory_items"
    for select using (clinic_id = public.get_user_clinic_id());

create policy "items_insert_same_clinic" on "public"."inventory_items"
    for insert with check (clinic_id = public.get_user_clinic_id());

create policy "items_update_same_clinic" on "public"."inventory_items"
    for update using (clinic_id = public.get_user_clinic_id()) with check (clinic_id = public.get_user_clinic_id());

create policy "items_delete_same_clinic" on "public"."inventory_items"
    for delete using (clinic_id = public.get_user_clinic_id());

-- Transactions: users can only access their own clinic's transactions
create policy "transactions_select_same_clinic" on "public"."inventory_transactions"
    for select using (clinic_id = public.get_user_clinic_id());

create policy "transactions_insert_same_clinic" on "public"."inventory_transactions"
    for insert with check (clinic_id = public.get_user_clinic_id());
