-- =============================================================
-- ClinicOS: repair supabase_migrations.schema_migrations history
-- Run this in the Supabase SQL Editor. Read STEP 1 output first.
-- =============================================================
--
-- WHY THIS IS NEEDED
-- Migrations 00005-00034 (and possibly others) were applied to the live
-- database long ago via the Supabase SQL Editor rather than `supabase db push`,
-- so they were never recorded in the supabase_migrations.schema_migrations
-- table. `supabase db push` compares local files against that table, concludes
-- those migrations are still pending, and offers to re-apply them.
--
-- DO NOT accept that. `supabase db push --include-all` would replay
-- 00017_add_admin_tables.sql, which contains 11 seed INSERTs with no
-- ON CONFLICT guard (6 notification_logs + 5 support_tickets). Replaying it
-- would inject duplicate fake support tickets into a live clinic database.
--
-- This script records the already-applied versions so the CLI stops trying to
-- re-apply them. It changes no application tables, no data, and no schema.


-- -------------------------------------------------------------
-- STEP 1 (safe, read-only): what does the remote history actually contain?
-- -------------------------------------------------------------
select version,
       name,
       inserted_at
from supabase_migrations.schema_migrations
order by version;


-- -------------------------------------------------------------
-- STEP 2 (safe, read-only): which local versions are missing from it?
-- Paste the local version list from the query below as the VALUES list.
-- This tells you exactly which rows STEP 3 will insert.
-- -------------------------------------------------------------
with local_migrations (version) as (
    values
        ('00001'), ('00002'), ('00003'), ('00004'), ('00005'),
        ('00006'), ('00007'), ('00008'), ('00009'), ('00010'),
        ('00011'), ('00012'), ('00013'), ('00014'), ('00015'),
        ('00016'), ('00017'), ('00018'), ('00019'), ('00020'),
        ('00021'), ('00022'), ('00023'), ('00024'), ('00025'),
        ('00026'), ('00027'), ('00028'), ('00029'), ('00030'),
        ('00031'), ('00032'), ('00033'), ('00034'), ('00035'),
        ('00036'), ('00037'), ('00038'), ('00039'), ('00040'),
        ('00041'), ('00043'), ('00044'), ('00045'), ('00046'),
        ('00047'), ('00048'), ('00049'), ('00050'), ('00051'),
        ('00052'), ('00053')
)
select l.version
from local_migrations l
left join supabase_migrations.schema_migrations m on m.version = l.version
where m.version is null
order by l.version;


-- =============================================================
-- STEP 3 (WRITE): only run this once you have read STEP 2 and agree with it.
--
-- Backfills ONLY the versions that STEP 2 reported as missing. If you are
-- unsure whether a given migration was really applied, leave it OUT of the
-- list below rather than guessing -- an incorrect entry will make the CLI
-- skip a migration that genuinely still needs to run.
--
-- The 'statements' column is NOT NULL in Supabase's schema, so it is set to an
-- empty array. That field is informational only; the CLI matches on 'version'.
-- ON CONFLICT DO NOTHING makes this safe to re-run.
-- =============================================================
insert into supabase_migrations.schema_migrations (version, name, statements)
select v.version, v.name, array[]::text[]
from (values
    -- ('00005', 'patients'),
    -- ('00006', 'inventory'),
    -- ... add the versions STEP 2 reported, with their real names ...
    -- Example of the shape (leave commented until you confirm):
    -- ('00043', 'expenses')
) as v (version, name)
on conflict (version) do nothing;


-- -------------------------------------------------------------
-- STEP 4 (safe, read-only): confirm the repair.
-- Every local version should now appear in remote.
-- -------------------------------------------------------------
with local_migrations (version) as (
    values ('00001'), ('00002'), ('00003'), ('00004'), ('00005'),
        ('00006'), ('00007'), ('00008'), ('00009'), ('00010'),
        ('00011'), ('00012'), ('00013'), ('00014'), ('00015'),
        ('00016'), ('00017'), ('00018'), ('00019'), ('00020'),
        ('00021'), ('00022'), ('00023'), ('00024'), ('00025'),
        ('00026'), ('00027'), ('00028'), ('00029'), ('00030'),
        ('00031'), ('00032'), ('00033'), ('00034'), ('00035'),
        ('00036'), ('00037'), ('00038'), ('00039'), ('00040'),
        ('00041'), ('00043'), ('00044'), ('00045'), ('00046'),
        ('00047'), ('00048'), ('00049'), ('00050'), ('00051'),
        ('00052'), ('00053')
)
select l.version
from local_migrations l
left join supabase_migrations.schema_migrations m on m.version = l.version
where m.version is null
order by l.version;
-- Expect: zero rows.
