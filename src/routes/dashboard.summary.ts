import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/dashboard/summary")({
  server: { handlers: { GET: async () => {
    const { data, error } = await (supabaseAdmin as any).from("projects").select("status,duration_days,po_tracking(po_available)");
    if (error) return Response.json({ error: error.message }, { status: 500 });
    const rows = data ?? [];
    const total = rows.length;
    const completed = rows.filter((r: any) => r.status === "Completed").length;
    const avgDuration = Math.round(rows.filter((r: any) => Number.isFinite(r.duration_days)).reduce((a: number, r: any) => a + r.duration_days, 0) / Math.max(1, rows.filter((r: any) => Number.isFinite(r.duration_days)).length));
    return Response.json({ total, completed, inProgress: total - completed, completionRate: total ? Math.round((completed / total) * 100) : 0, avgDuration, projectsWithoutPO: rows.filter((r: any) => !r.po_tracking?.po_available).length });
  } } },
});
