import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { clinicId } = await req.json();
    if (!clinicId) {
      return new Response(JSON.stringify({ error: "clinicId required" }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: creds } = await supabase
      .from("whatsapp_credentials")
      .select("id, access_token, phone_number_id, api_version, is_connected")
      .eq("clinic_id", clinicId)
      .single();

    if (!creds) {
      return new Response(JSON.stringify({
        connected: false,
        error: "No credentials configured",
      }), { headers: { "Content-Type": "application/json" } });
    }

    const apiVersion = creds.api_version || "v22.0";
    const url = `https://graph.facebook.com/${apiVersion}/${creds.phone_number_id}`;
    const now = new Date().toISOString();

    try {
      const healthRes = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${creds.access_token}` },
      });

      if (healthRes.ok) {
        await supabase.from("whatsapp_credentials").update({
          is_connected: true,
          last_health_check_at: now,
          health_check_passed: true,
        }).eq("id", creds.id);

        return new Response(JSON.stringify({
          connected: true,
          phone_number_id: creds.phone_number_id,
          last_health_check_at: now,
        }), { headers: { "Content-Type": "application/json" } });
      } else {
        await supabase.from("whatsapp_credentials").update({
          is_connected: false,
          last_health_check_at: now,
          health_check_passed: false,
        }).eq("id", creds.id);

        return new Response(JSON.stringify({
          connected: false,
          error: `Meta API returned ${healthRes.status}`,
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    } catch (fetchErr) {
      await supabase.from("whatsapp_credentials").update({
        is_connected: false,
        last_health_check_at: now,
        health_check_passed: false,
      }).eq("id", creds.id);

      return new Response(JSON.stringify({
        connected: false,
        error: fetchErr.message,
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
