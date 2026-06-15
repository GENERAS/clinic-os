-- ClinicOS Seed Data
-- Creates default clinic, roles and permissions for MVP

-- ********************************************
-- DEFAULT CLINIC (required for auth trigger)
-- ********************************************
insert into "public"."clinics" (name, slug, timezone) values
    ('My Clinic', 'my-clinic', 'UTC')
on conflict (slug) do nothing;

-- ********************************************
-- ROLES
-- ********************************************
insert into "public"."roles" (name, description) values
    ('Owner', 'Full access to all clinic features and settings'),
    ('Doctor', 'Access to patient records, appointments, and medical workflows'),
    ('Receptionist', 'Manage appointments, patient check-in, and basic patient info'),
    ('Pharmacist', 'Manage inventory, dispensing, and stock tracking')
on conflict (name) do nothing;

-- ********************************************
-- PERMISSIONS
-- ********************************************
insert into "public"."permissions" (name, description) values
    -- Patients
    ('view_patients', 'View patient profiles and history'),
    ('create_patients', 'Create new patient records'),
    ('edit_patients', 'Edit existing patient records'),
    ('delete_patients', 'Delete patient records'),

    -- Appointments
    ('view_appointments', 'View appointment schedule'),
    ('create_appointments', 'Create new appointments'),
    ('edit_appointments', 'Edit existing appointments'),
    ('delete_appointments', 'Cancel or delete appointments'),
    ('confirm_appointments', 'Confirm appointments'),

    -- Inventory
    ('view_inventory', 'View medicine and supply inventory'),
    ('manage_inventory', 'Add, edit, and remove inventory items'),

    -- Staff
    ('view_staff', 'View staff members'),
    ('manage_staff', 'Add, edit, and remove staff members'),

    -- WhatsApp
    ('view_whatsapp', 'View WhatsApp message history'),
    ('send_whatsapp', 'Send WhatsApp messages'),

    -- Billing
    ('view_billing', 'View billing and payment records'),
    ('create_invoices', 'Create invoices'),
    ('record_payments', 'Record payments'),

    -- Settings
    ('view_settings', 'View clinic settings'),
    ('manage_settings', 'Modify clinic settings'),

    -- Reports
    ('view_reports', 'View clinic reports and analytics')
on conflict (name) do nothing;

-- ********************************************
-- OWNER PERMISSIONS (full access)
-- ********************************************
insert into "public"."role_permissions" (role_id, permission_id)
select r.id, p.id
from "public"."roles" r
cross join "public"."permissions" p
where r.name = 'Owner'
on conflict (role_id, permission_id) do nothing;

-- ********************************************
-- DOCTOR PERMISSIONS
-- ********************************************
insert into "public"."role_permissions" (role_id, permission_id)
select r.id, p.id
from "public"."roles" r
cross join "public"."permissions" p
where r.name = 'Doctor'
  and p.name in (
    'view_patients', 'create_patients', 'edit_patients',
    'view_appointments', 'create_appointments', 'edit_appointments',
    'view_inventory',
    'view_whatsapp', 'send_whatsapp',
    'view_billing'
  )
on conflict (role_id, permission_id) do nothing;

-- ********************************************
-- RECEPTIONIST PERMISSIONS
-- ********************************************
insert into "public"."role_permissions" (role_id, permission_id)
select r.id, p.id
from "public"."roles" r
cross join "public"."permissions" p
where r.name = 'Receptionist'
  and p.name in (
    'view_patients', 'create_patients', 'edit_patients',
    'view_appointments', 'create_appointments', 'edit_appointments', 'delete_appointments', 'confirm_appointments',
    'view_whatsapp', 'send_whatsapp'
  )
on conflict (role_id, permission_id) do nothing;

-- ********************************************
-- PHARMACIST PERMISSIONS
-- ********************************************
insert into "public"."role_permissions" (role_id, permission_id)
select r.id, p.id
from "public"."roles" r
cross join "public"."permissions" p
where r.name = 'Pharmacist'
  and p.name in (
    'view_inventory', 'manage_inventory',
    'view_patients',
    'view_billing'
  )
on conflict (role_id, permission_id) do nothing;
