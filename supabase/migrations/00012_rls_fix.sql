-- ClinicOS Migration 00012: Robust RLS policies using inline subqueries
-- Replaces reliance on get_user_clinic_id() function with inline subqueries.
-- This ensures policies work even if the function definition becomes stale.

-- Helper: clinic-scoped policies use direct inline subquery instead of function call
-- Pattern: (clinic_id = (SELECT clinic_id FROM public.users WHERE id = auth.uid()))

-- 1. Drop old policies that depend on get_user_clinic_id()
do $$
declare
  rec record;
begin
  for rec in
    select distinct policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual::text, '') like '%get_user_clinic_id%'
        or coalesce(with_check::text, '') like '%get_user_clinic_id%')
  loop
    execute format('drop policy if exists %I on public.%I', rec.policyname, rec.tablename);
  end loop;
end $$;

-- 2. Recreate all policies with inline subquery
-- Appointments
create policy "appointments_select_same_clinic" on public.appointments
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "appointments_insert_same_clinic" on public.appointments
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "appointments_update_same_clinic" on public.appointments
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "appointments_delete_same_clinic" on public.appointments
  for delete using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Patients
create policy "patients_select_same_clinic" on public.patients
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "patients_insert_same_clinic" on public.patients
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "patients_update_same_clinic" on public.patients
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "patients_delete_same_clinic" on public.patients
  for delete using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Inventory items
create policy "items_select_same_clinic" on public.inventory_items
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "items_insert_same_clinic" on public.inventory_items
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "items_update_same_clinic" on public.inventory_items
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "items_delete_same_clinic" on public.inventory_items
  for delete using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Inventory categories
create policy "categories_select_same_clinic" on public.inventory_categories
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "categories_insert_same_clinic" on public.inventory_categories
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "categories_update_same_clinic" on public.inventory_categories
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "categories_delete_same_clinic" on public.inventory_categories
  for delete using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Inventory transactions
create policy "transactions_select_same_clinic" on public.inventory_transactions
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "transactions_insert_same_clinic" on public.inventory_transactions
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Staff invitations
create policy "staff_invitations_select_same_clinic" on public.staff_invitations
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "staff_invitations_insert_same_clinic" on public.staff_invitations
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "staff_invitations_update_same_clinic" on public.staff_invitations
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Clinic operating hours
create policy "operating_hours_select_same_clinic" on public.clinic_operating_hours
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "operating_hours_insert_same_clinic" on public.clinic_operating_hours
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "operating_hours_update_same_clinic" on public.clinic_operating_hours
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "operating_hours_delete_same_clinic" on public.clinic_operating_hours
  for delete using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Clinics
create policy "clinics_select_own" on public.clinics
  for select using (
    id = (select clinic_id from public.users where id = auth.uid())
  );

-- Users: keep the existing select_own, add select_same_clinic with inline subquery
create policy "users_select_same_clinic" on public.users
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Audit logs
create policy "audit_logs_select_same_clinic" on public.audit_logs
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "audit_logs_insert_authenticated" on public.audit_logs
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Notifications
create policy "notifications_select_same_clinic" on public.notifications
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "notifications_update_own" on public.notifications
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Clinic preferences
create policy "preferences_select_same_clinic" on public.clinic_preferences
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "preferences_insert_same_clinic" on public.clinic_preferences
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "preferences_update_same_clinic" on public.clinic_preferences
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Clinic notification settings
create policy "notification_settings_select_same_clinic" on public.clinic_notification_settings
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "notification_settings_insert_same_clinic" on public.clinic_notification_settings
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "notification_settings_update_same_clinic" on public.clinic_notification_settings
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- Appointment notes
create policy "notes_select_same_clinic" on public.appointment_notes
  for select using (
    appointment_id in (select id from public.appointments where clinic_id = (select clinic_id from public.users where id = auth.uid()))
  );
create policy "notes_insert_same_clinic" on public.appointment_notes
  for insert with check (
    appointment_id in (select id from public.appointments where clinic_id = (select clinic_id from public.users where id = auth.uid()))
  );

-- Appointment status history
create policy "status_history_select_same_clinic" on public.appointment_status_history
  for select using (
    appointment_id in (select id from public.appointments where clinic_id = (select clinic_id from public.users where id = auth.uid()))
  );
create policy "status_history_insert_same_clinic" on public.appointment_status_history
  for insert with check (
    appointment_id in (select id from public.appointments where clinic_id = (select clinic_id from public.users where id = auth.uid()))
  );

-- Patient notes
create policy "patient_notes_select_same_clinic" on public.patient_notes
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "patient_notes_insert_same_clinic" on public.patient_notes
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- User roles
create policy "user_roles_select_same_clinic" on public.user_roles
  for select using (
    user_id in (
      select id from public.users
      where clinic_id = (select clinic_id from public.users where id = auth.uid())
    )
  );

-- WhatsApp credentials
create policy "credentials_select_same_clinic" on public.whatsapp_credentials
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "credentials_insert_same_clinic" on public.whatsapp_credentials
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "credentials_update_same_clinic" on public.whatsapp_credentials
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "credentials_delete_same_clinic" on public.whatsapp_credentials
  for delete using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- WhatsApp messages
create policy "messages_select_same_clinic" on public.whatsapp_messages
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "messages_insert_same_clinic" on public.whatsapp_messages
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "messages_update_same_clinic" on public.whatsapp_messages
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );

-- WhatsApp templates
create policy "templates_select_same_clinic" on public.whatsapp_templates
  for select using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "templates_insert_same_clinic" on public.whatsapp_templates
  for insert with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "templates_update_same_clinic" on public.whatsapp_templates
  for update using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  ) with check (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
create policy "templates_delete_same_clinic" on public.whatsapp_templates
  for delete using (
    clinic_id = (select clinic_id from public.users where id = auth.uid())
  );
