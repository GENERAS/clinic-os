-- Add missing roles for clinic staff
INSERT INTO public.roles (name, description) VALUES
  ('Nurse', 'Nurses who handle triage, vitals, and patient care'),
  ('Lab Technician', 'Laboratory technicians who process tests and enter results'),
  ('Cashier', 'Cashiers who handle payments and billing'),
  ('Accountant', 'Accountants who manage financial records and reporting'),
  ('Administrator', 'Administrative staff with broad operational access'),
  ('Manager', 'Clinic managers with oversight of operations and staff')
ON CONFLICT (name) DO NOTHING;

-- Add role-permission mappings for new roles
DO 
DECLARE
  perm_record RECORD;
  nurse_role_id UUID;
  lab_role_id UUID;
  cashier_role_id UUID;
  accountant_role_id UUID;
  admin_role_id UUID;
  manager_role_id UUID;
BEGIN
  SELECT id INTO nurse_role_id FROM public.roles WHERE name = 'Nurse';
  SELECT id INTO lab_role_id FROM public.roles WHERE name = 'Lab Technician';
  SELECT id INTO cashier_role_id FROM public.roles WHERE name = 'Cashier';
  SELECT id INTO accountant_role_id FROM public.roles WHERE name = 'Accountant';
  SELECT id INTO admin_role_id FROM public.roles WHERE name = 'Administrator';
  SELECT id INTO manager_role_id FROM public.roles WHERE name = 'Manager';

  -- Nurse permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT nurse_role_id, id FROM public.permissions WHERE name IN (
    'view_patients', 'create_patients', 'update_patients',
    'view_appointments', 'create_appointments',
    'view_inventory'
  ) ON CONFLICT DO NOTHING;

  -- Lab Technician permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT lab_role_id, id FROM public.permissions WHERE name IN (
    'view_patients',
    'view_appointments',
    'view_inventory', 'update_inventory'
  ) ON CONFLICT DO NOTHING;

  -- Cashier permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT cashier_role_id, id FROM public.permissions WHERE name IN (
    'view_patients',
    'view_appointments',
    'view_inventory',
    'manage_billing', 'view_billing',
    'manage_insurance', 'view_insurance'
  ) ON CONFLICT DO NOTHING;

  -- Accountant permissions
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT accountant_role_id, id FROM public.permissions WHERE name IN (
    'view_patients',
    'view_appointments',
    'view_inventory',
    'manage_billing', 'view_billing',
    'manage_insurance', 'view_insurance',
    'view_reports', 'manage_settings'
  ) ON CONFLICT DO NOTHING;

  -- Administrator permissions (all except clinical)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT admin_role_id, id FROM public.permissions WHERE name IN (
    'view_patients', 'create_patients', 'update_patients',
    'view_appointments', 'create_appointments', 'update_appointments',
    'view_inventory', 'create_inventory', 'update_inventory',
    'manage_staff', 'view_staff',
    'manage_settings', 'view_reports',
    'manage_billing', 'view_billing',
    'manage_insurance', 'view_insurance',
    'manage_whatsapp', 'view_whatsapp'
  ) ON CONFLICT DO NOTHING;

  -- Manager permissions (all)
  INSERT INTO public.role_permissions (role_id, permission_id)
  SELECT manager_role_id, id FROM public.permissions
  ON CONFLICT DO NOTHING;

END ;

