-- Migration 00031: Add failure_reason to whatsapp_credentials
ALTER TABLE public.whatsapp_credentials
  ADD COLUMN IF NOT EXISTS failure_reason text;
