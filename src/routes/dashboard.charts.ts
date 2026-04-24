import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/dashboard/charts")({
  server: { handlers: { GET: async () => {
    const { data, error } = await (supabaseAdmin as any).from("projects").select("status,scope_type,clients(name),project_metrics(month_start,month_complete),po_tracking(po_available)");
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ rows: data ?? [] });
  } } },
});
