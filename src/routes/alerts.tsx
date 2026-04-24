import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { countryName, getPoAlertLabel, isPoAlertProject, loadDashboardData, poId, Project } from "@/lib/project-data";

export const Route = createFileRoute("/alerts")({ component: AlertsPage });

function AlertsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const data = await loadDashboardData();
        if (alive) setProjects(data.projects);
      } catch (error) {
        if (alive) window.alert(error instanceof Error ? error.message : "Failed to load alerts.");
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const alerts = useMemo(
    () =>
      projects
        .filter(isPoAlertProject)
        .filter((project) => {
          const haystack = `${project.project_code} ${project.clients?.name ?? ""} ${project.project_sites?.[0]?.sites?.site_code ?? ""} ${project.po_tracking?.po_compliance_status ?? ""}`.toLowerCase();
          return !query || haystack.includes(query.toLowerCase());
        })
        .sort((a, b) => String(b.start_date ?? "").localeCompare(String(a.start_date ?? ""))),
    [projects, query],
  );

  return (
    <div className="app-page">
      <div className="shell-topbar">
        <div>
          <div className="text-xs text-muted-foreground font-medium">PO monitoring</div>
          <div className="text-2xl font-black text-foreground tracking-tight">Alerts</div>
        </div>
      </div>

      <div className="page-gutter mt-4 grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="finance-card">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Active PO alerts</div>
              <div className="mt-3 text-4xl font-black tracking-tight text-foreground">{alerts.length}</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
              <ShieldAlert size={18} />
            </div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Only PO-related exceptions appear here. Pipeline and scope-only items are intentionally excluded.</p>
        </div>

        <div className="finance-card">
          <div className="section-title mb-3">Search alert records</div>
          <input className="finance-input" placeholder="Project code, client, site, PO status" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>

      <div className="page-gutter mt-4">
        <section className="table-wrap">
          <div className="flex justify-between items-center p-4 border-b border-border">
            <div>
              <div className="section-title">All PO Alerts</div>
              <div className="text-xs text-muted-foreground mt-1">{alerts.length} records</div>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">project code</th>
                  <th className="px-4 py-3 text-left font-semibold">client</th>
                  <th className="px-4 py-3 text-left font-semibold">site</th>
                  <th className="px-4 py-3 text-left font-semibold">alert</th>
                  <th className="px-4 py-3 text-left font-semibold">po compliance</th>
                  <th className="px-4 py-3 text-left font-semibold">status</th>
                  <th className="px-4 py-3 text-left font-semibold">start date</th>
                </tr>
              </thead>
              <tbody>
                {alerts.length ? (
                  alerts.map((project) => (
                    <tr key={project.id} onClick={() => setSelected(project)} className="cursor-pointer border-t border-border hover:bg-accent/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold">{project.project_code}</td>
                      <td className="px-4 py-3">{project.clients?.name ?? "Unspecified"}</td>
                      <td className="px-4 py-3">{project.project_sites?.[0]?.sites?.site_code ?? "Unspecified"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                          <AlertTriangle size={12} />
                          {getPoAlertLabel(project)}
                        </span>
                      </td>
                      <td className="px-4 py-3">{project.po_tracking?.po_compliance_status ?? "No PO"}</td>
                      <td className="px-4 py-3">{project.status}</td>
                      <td className="px-4 py-3">{project.start_date ?? "Not started"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No PO alerts match the current search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl bg-card border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">{selected?.project_code}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5 text-sm">
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive font-semibold">
                {getPoAlertLabel(selected)}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Client" value={selected.clients?.name ?? "Unspecified"} />
                <Info label="Site" value={selected.project_sites?.[0]?.sites?.site_code ?? "Unspecified"} />
                <Info label="Country" value={countryName(selected.country)} />
                <Info label="PO ID" value={poId(selected.po_tracking)} />
                <Info label="Status" value={selected.status} />
                <Info label="Start Date" value={selected.start_date ?? "Not started"} />
              </div>
              <p className="text-muted-foreground">{selected.description ?? "No description provided."}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
