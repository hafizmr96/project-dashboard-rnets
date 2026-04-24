import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const projectPayloadSchema = z.object({
  project_code: z.string().trim().min(1, "Project code is required"),
  client_id: z.string().uuid().nullable(),
  country: z.string().trim().nullable(),
  description: z.string().trim().nullable(),
  status: z.string().trim().min(1, "Status is required"),
  scope_type: z.enum(["Original", "Additional"]).nullable(),
  as_count: z.number().int().min(0),
  start_date: z.string().nullable(),
  completed_date: z.string().nullable(),
  site_id: z.string().uuid().nullable(),
  po_available: z.boolean(),
  po_compliance_status: z.string().trim().nullable(),
});

type ProjectPayload = z.infer<typeof projectPayloadSchema>;

function normalizeNullable(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildProjectRecord(payload: ProjectPayload) {
  return {
    project_code: payload.project_code.trim(),
    client_id: payload.client_id,
    country: normalizeNullable(payload.country),
    description: normalizeNullable(payload.description),
    status: payload.status.trim(),
    scope_type: payload.scope_type,
    as_count: payload.as_count,
    start_date: payload.start_date,
    completed_date: payload.completed_date,
  };
}

async function upsertProjectRelations(projectId: string, payload: ProjectPayload) {
  const db = supabaseAdmin as any;

  const poResult = await db.from("po_tracking").upsert(
    {
      project_id: projectId,
      po_available: payload.po_available,
      po_compliance_status: normalizeNullable(payload.po_compliance_status),
    },
    { onConflict: "project_id" },
  );
  if (poResult.error) {
    throw new Error(poResult.error.message);
  }

  if (payload.site_id) {
    const deleteLinks = await db.from("project_sites").delete().eq("project_id", projectId).neq("site_id", payload.site_id);
    if (deleteLinks.error) {
      throw new Error(deleteLinks.error.message);
    }

    const insertLink = await db.from("project_sites").upsert(
      { project_id: projectId, site_id: payload.site_id },
      { onConflict: "project_id,site_id" },
    );
    if (insertLink.error) {
      throw new Error(insertLink.error.message);
    }
  } else {
    const removeLinks = await db.from("project_sites").delete().eq("project_id", projectId);
    if (removeLinks.error) {
      throw new Error(removeLinks.error.message);
    }
  }

  const metricsResult = await db.from("project_metrics").upsert(
    {
      project_id: projectId,
      month_start: payload.start_date ? `${payload.start_date.slice(0, 7)}-01` : null,
      month_complete: payload.completed_date ? `${payload.completed_date.slice(0, 7)}-01` : null,
    },
    { onConflict: "project_id" },
  );
  if (metricsResult.error) {
    throw new Error(metricsResult.error.message);
  }
}

async function fetchProjects() {
  const { data, error } = await (supabaseAdmin as any)
    .from("projects")
    .select("*, clients(name), project_sites(sites(id,site_code,country)), po_tracking(po_available,po_compliance_status), project_metrics(month_start,month_complete)")
    .order("start_date", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ projects: data ?? [] });
}

export const Route = createFileRoute("/projects")({
  server: {
    handlers: {
      GET: async () => fetchProjects(),
      POST: async ({ request }) => {
        try {
          const payload = projectPayloadSchema.parse(await request.json());
          const db = supabaseAdmin as any;
          const { data, error } = await db.from("projects").insert(buildProjectRecord(payload)).select("id").single();
          if (error || !data) {
            return Response.json({ error: error?.message ?? "Failed to create project" }, { status: 400 });
          }

          await upsertProjectRelations(data.id, payload);
          return fetchProjects();
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
        }
      },
      PUT: async ({ request }) => {
        try {
          const body = await request.json();
          const id = z.string().uuid().parse(body.id);
          const payload = projectPayloadSchema.parse(body);
          const db = supabaseAdmin as any;
          const { error } = await db.from("projects").update(buildProjectRecord(payload)).eq("id", id);
          if (error) {
            return Response.json({ error: error.message }, { status: 400 });
          }

          await upsertProjectRelations(id, payload);
          return fetchProjects();
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
        }
      },
      DELETE: async ({ request }) => {
        try {
          const { id } = z.object({ id: z.string().uuid() }).parse(await request.json());
          const { error } = await (supabaseAdmin as any).from("projects").delete().eq("id", id);
          if (error) {
            return Response.json({ error: error.message }, { status: 400 });
          }

          return fetchProjects();
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
        }
      },
    },
  },
});
