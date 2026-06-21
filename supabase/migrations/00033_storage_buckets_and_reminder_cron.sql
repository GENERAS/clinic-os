-- Migration 00033: Storage buckets (clinic-logos, avatars) + reminder cron
-- Safe to run repeatedly (DO $$ blocks)

-- 1. Create storage buckets if they don't exist
DO $$ BEGIN
    INSERT INTO storage.buckets (id, name, public, avif_autodetection)
    VALUES ('clinic-logos', 'clinic-logos', true, false)
    ON CONFLICT (id) DO NOTHING;
END $$;

DO $$ BEGIN
    INSERT INTO storage.buckets (id, name, public, avif_autodetection)
    VALUES ('avatars', 'avatars', true, false)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- 2. Storage RLS policies for clinic-logos bucket
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='clinic_logos_select_public') THEN
        CREATE POLICY "clinic_logos_select_public" ON storage.objects
            FOR SELECT TO public USING (bucket_id = 'clinic-logos');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='clinic_logos_insert_own') THEN
        CREATE POLICY "clinic_logos_insert_own" ON storage.objects
            FOR INSERT TO authenticated WITH CHECK (bucket_id = 'clinic-logos');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='clinic_logos_update_own') THEN
        CREATE POLICY "clinic_logos_update_own" ON storage.objects
            FOR UPDATE TO authenticated USING (bucket_id = 'clinic-logos');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='clinic_logos_delete_own') THEN
        CREATE POLICY "clinic_logos_delete_own" ON storage.objects
            FOR DELETE TO authenticated USING (bucket_id = 'clinic-logos');
    END IF;
END $$;

-- 3. Storage RLS policies for avatars bucket
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_select_public') THEN
        CREATE POLICY "avatars_select_public" ON storage.objects
            FOR SELECT TO public USING (bucket_id = 'avatars');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_insert_own') THEN
        CREATE POLICY "avatars_insert_own" ON storage.objects
            FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_update_own') THEN
        CREATE POLICY "avatars_update_own" ON storage.objects
            FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars_delete_own') THEN
        CREATE POLICY "avatars_delete_own" ON storage.objects
            FOR DELETE TO authenticated USING (bucket_id = 'avatars');
    END IF;
END $$;

-- 4. Schedule process-reminders via pg_cron (runs every 30 minutes)
-- Use different dollar-quoting ($cron$ ... $cron$) to avoid nesting conflict
DO $cron$
BEGIN
    PERFORM cron.unschedule('process-reminders');
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$cron$;

DO $cron$
BEGIN
    PERFORM cron.schedule('process-reminders', '*/30 * * * *', $cronbody$
        SELECT net.http_post(
            url := current_setting('app.settings.supabase_url') || '/functions/v1/process-reminders',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
            ),
            body := '{}'
        ) AS request_id;
    $cronbody$);
EXCEPTION WHEN OTHERS THEN
    NULL;
END;
$cron$;
