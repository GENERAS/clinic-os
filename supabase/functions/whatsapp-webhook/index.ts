import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // GET: Webhook verification (Meta handshake)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token && challenge) {
      const { data: cred } = await supabase
        .from("whatsapp_credentials")
        .select("webhook_verify_token")
        .eq("webhook_verify_token", token)
        .maybeSingle();

      if (cred) {
        return new Response(challenge, { status: 200 });
      }
    }
    return new Response("Verification failed", { status: 403 });
  }

  // POST: Status update callbacks from Meta
  if (req.method === "POST") {
    try {
      const payload = await req.json();

      const entries = payload?.entry || [];
      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const value = change?.value;
          if (!value) continue;

          const statuses = value.statuses || [];
          for (const status of statuses) {
            const providerMessageId = status.id;
            const statusName = status.status;
            const timestamp = status.timestamp;
            const dateStr = timestamp
              ? new Date(Number(timestamp) * 1000).toISOString()
              : new Date().toISOString();

            const statusDb =
              statusName === "sent" ? "sent" :
              statusName === "delivered" ? "delivered" :
              statusName === "read" ? "read" : "failed";

            const updateData: Record<string, unknown> = { status: statusDb };
            if (statusDb === "sent") updateData.sent_at = dateStr;
            else if (statusDb === "delivered") updateData.delivered_at = dateStr;
            else if (statusDb === "read") updateData.read_at = dateStr;
            else if (statusDb === "failed") {
              updateData.failed_at = dateStr;
              updateData.error_message = status.errors?.[0]?.title || null;
            }

            await supabase
              .from("whatsapp_messages")
              .update(updateData)
              .eq("provider_message_id", providerMessageId);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
