-- Migration 00036: Create SECURITY DEFINER RPC for clinic onboarding
-- Fixes 403 RLS error on clinics INSERT by bypassing RLS for the entire
-- onboarding flow (create clinic, assign Owner role, insert defaults)

-- Secure RPC that handles all onboarding inserts atomically
create or replace function create_clinic_onboarding(
  p_name text,
  p_slug text,
  p_phone text,
  p_timezone text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic_id uuid;
  v_user_id uuid;
  v_owner_role_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into clinics (name, slug, phone, status, timezone, onboarding_completed)
  values (p_name, p_slug, p_phone, 'active', p_timezone, true)
  returning id into v_clinic_id;

  update public.users set clinic_id = v_clinic_id where id = v_user_id;

  select id into v_owner_role_id from roles where name = 'Owner';
  if v_owner_role_id is not null then
    insert into user_roles (user_id, role_id)
    values (v_user_id, v_owner_role_id)
    on conflict (user_id, role_id) do nothing;
  end if;

  insert into clinic_preferences (clinic_id, currency, date_format, time_format, language)
  values (v_clinic_id, 'RWF', 'DD/MM/YYYY', 'HH:mm', 'en')
  on conflict (clinic_id) do nothing;

  insert into clinic_notification_settings (clinic_id, appointment_reminders_enabled, low_stock_alerts_enabled, system_notifications_enabled, whatsapp_reminders_enabled, reminder_hours_before)
  values (v_clinic_id, true, true, true, false, 24)
  on conflict (clinic_id) do nothing;

  return v_clinic_id;
end;
$$;
