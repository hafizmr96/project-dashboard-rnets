import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Download,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Client,
  colors,
  countryName,
  getPoAlertLabel,
  isPoAlertProject,
  loadDashboardData,
  poId,
  poLabel,
  Project,
  Site,
  SitePerformance,
  statusCategory,
} from "@/lib/project-data";

type ProjectFormState = {
  project_code: string;
  client_id: string;
  country: string;
  description: string;
  status: string;
  scope_type: string;
  as_count: string;
  start_date: string;
  completed_date: string;
  site_id: string;
  po_available: boolean;
  po_compliance_status: string;
};

const statusOptions = ["Presales", "G1", "G2", "G3", "G4", "G5", "G6", "Completed"];
const scopeOptions = ["Original", "Additional"];
const poStatusOptions = ["PO available", "Started without PO", "Completed without PO", "No PO"];
const filterConfigs = [
  { key: "client", label: "Client", allLabel: "All clients", values: (project: Project) => project.clients?.name },
  { key: "country", label: "Country", allLabel: "All countries", values: (project: Project) => project.country },
  { key: "site", label: "Site", allLabel: "All sites", values: (project: Project) => project.project_sites?.[0]?.sites?.site_code },
  { key: "status", label: "Status", allLabel: "All statuses", values: (project: Project) => project.status },
  { key: "scope", label: "Scope", allLabel: "All scopes", values: (project: Project) => project.scope_type },
] as const;

const emptyForm = (): ProjectFormState => ({
  project_code: "",
  client_id: "",
  country: "",
  description: "",
  status: "Presales",
  scope_type: "",
  as_count: "0",
  start_date: "",
  completed_date: "",
  site_id: "",
  po_available: false,
  po_compliance_status: "No PO",
});

export const Route = createFileRoute("/")({ component: DashboardPage });

function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [sitePerformance, setSitePerformance] = useState<SitePerformance[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<ProjectFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [sort, setSort] = useState<keyof Project>("start_date");
  const [filters, setFilters] = useState({ q: "", client: "All", country: "All", site: "All", status: "All", scope: "All", from: "", to: "" });

  async function loadProjects() {
    const data = await loadDashboardData();
    setClients(data.clients);
    setSites(data.sites);
    setProjects(data.projects);
    setSitePerformance(data.sitePerformance);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await loadProjects();
      } catch (error) {
        if (alive) {
          console.error("Project load failed", error);
          window.alert(error instanceof Error ? error.message : "Failed to load projects.");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(
    () =>
      projects
        .filter((project) => {
          const site = project.project_sites?.[0]?.sites?.site_code ?? "Unspecified";
          const client = project.clients?.name ?? "Unspecified";
          const q = `${project.project_code} ${client} ${site} ${project.description ?? ""}`.toLowerCase();
          return (
            (!filters.q || q.includes(filters.q.toLowerCase())) &&
            (filters.client === "All" || client === filters.client) &&
            (filters.country === "All" || project.country === filters.country) &&
            (filters.site === "All" || site === filters.site) &&
            (filters.status === "All" || project.status === filters.status) &&
            (filters.scope === "All" || project.scope_type === filters.scope) &&
            (!filters.from || (project.start_date && project.start_date >= filters.from)) &&
            (!filters.to || (project.start_date && project.start_date <= filters.to))
          );
        })
        .sort((a, b) => String(b[sort] ?? "").localeCompare(String(a[sort] ?? ""))),
    [projects, filters, sort],
  );

  const completed = rows.filter((project) => project.status === "Completed").length;
  const withPo = rows.filter((project) => project.po_tracking?.po_available).length;
  const inProgress = rows.filter((project) => statusCategory(project.status) === "In Progress").length;
  const alerts = rows.filter(isPoAlertProject);
  const topClients = Object.values(
    rows.reduce((acc, project) => {
      const key = project.clients?.name ?? "Unspecified";
      acc[key] = { client: key, value: (acc[key]?.value ?? 0) + 1 };
      return acc;
    }, {} as Record<string, { client: string; value: number }>),
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const filteredSitePerformance = sitePerformance.filter((site) => filters.country === "All" || site.country_id === filters.country).slice(0, 6);
  const poBreakdown = [
    { name: "With PO", value: rows.filter((project) => poId(project.po_tracking) === "OK").length },
    { name: "SWOP", value: rows.filter((project) => poId(project.po_tracking) === "SWOP").length },
    { name: "CWOP", value: rows.filter((project) => poId(project.po_tracking) === "CWOP").length },
  ];
  const statusFunnel = ["Pipeline", "In Progress", "Closed"].map((stage) => ({
    stage,
    value: rows.filter((project) => statusCategory(project.status) === stage).length,
  }));

  const options = (fn: (project: Project) => string | null | undefined) => Array.from(new Set(projects.map(fn).filter(Boolean) as string[])).sort();

  function updateForm<K extends keyof ProjectFormState>(key: K, value: ProjectFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function openCreateForm() {
    setEditingProject(null);
    setForm(emptyForm());
    setIsFormOpen(true);
  }

  function openEditForm(project: Project) {
    setEditingProject(project);
    setForm({
      project_code: project.project_code,
      client_id: project.client_id ?? "",
      country: project.country ?? "",
      description: project.description ?? "",
      status: project.status,
      scope_type: project.scope_type ?? "",
      as_count: String(project.as_count ?? 0),
      start_date: project.start_date ?? "",
      completed_date: project.completed_date ?? "",
      site_id: project.project_sites?.[0]?.sites?.id ?? "",
      po_available: Boolean(project.po_tracking?.po_available),
      po_compliance_status: project.po_tracking?.po_compliance_status ?? "No PO",
    });
    setIsFormOpen(true);
  }

  async function submitProject() {
    if (!form.project_code.trim()) {
      window.alert("Project code is required.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...(editingProject ? { id: editingProject.id } : {}),
        project_code: form.project_code.trim(),
        client_id: form.client_id || null,
        country: form.country || null,
        description: form.description || null,
        status: form.status,
        scope_type: form.scope_type || null,
        as_count: Number.isFinite(Number(form.as_count)) ? Math.max(0, Number(form.as_count)) : 0,
        start_date: form.start_date || null,
        completed_date: form.completed_date || null,
        site_id: form.site_id || null,
        po_available: form.po_available,
        po_compliance_status: form.po_compliance_status || null,
      };

      const response = await fetch("/projects", {
        method: editingProject ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save project.");
      }

      await loadProjects();
      setIsFormOpen(false);
      setEditingProject(null);
      setForm(emptyForm());
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to save project.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProject(project: Project) {
    const confirmed = window.confirm(`Delete project ${project.project_code}? This cannot be undone.`);
    if (!confirmed) return;

    setIsSaving(true);
    try {
      const response = await fetch("/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: project.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to delete project.");
      }

      await loadProjects();
      if (selected?.id === project.id) setSelected(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete project.");
    } finally {
      setIsSaving(false);
    }
  }

  const exportCsv = () => {
    const csv = [
      ["Project Code", "Client", "Site", "Status Category", "Status", "PO ID", "PO Compliance", "Scope Type", "Start Date", "Completed Date", "Duration"],
      ...rows.map((project) => [
        project.project_code,
        project.clients?.name ?? "",
        project.project_sites?.[0]?.sites?.site_code ?? "",
        statusCategory(project.status),
        project.status,
        poId(project.po_tracking),
        project.po_tracking?.po_compliance_status ?? "",
        project.scope_type ?? "",
        project.start_date ?? "",
        project.completed_date ?? "",
        project.duration_days ?? "",
      ]),
    ]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "fact-projects-export.csv";
    a.click();
  };

  return (
    <div className="app-page">
      <div className="shell-topbar">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Project Pulse dashboard</div>
          <div className="text-2xl font-black text-foreground tracking-tight">Overview</div>
        </div>
        <div className="hidden sm:flex gap-2">
          <button onClick={openCreateForm} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            <Plus size={16} />
            Add Project
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="page-gutter mt-4">
        <div className="finance-card flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-primary">Control summary</div>
            <div className="mt-1 text-3xl font-black tracking-tight text-foreground">Delivery health and PO exposure</div>
            <div className="mt-2 text-sm text-muted-foreground">Compact operational view inspired by Flexi Finance Hub, adapted for project controls.</div>
          </div>
          <div className="flex flex-wrap gap-2 sm:hidden">
            <button onClick={openCreateForm} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
              <Plus size={16} />
              Add
            </button>
            <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground">
              <Download size={16} />
              Export
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/alerts" className="finance-chip">PO alerts {alerts.length}</Link>
            <Link to="/data-dictionary" className="finance-chip">Reference</Link>
          </div>
        </div>
      </div>

      <div className="page-gutter mt-4 grid gap-3 grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Projects" value={rows.length} icon={ArrowUpRight} tone="text-primary" />
        <MetricCard label="Completed" value={completed} icon={TrendingUp} tone="text-primary" />
        <MetricCard label="In Progress" value={inProgress} icon={TrendingDown} tone="text-muted-foreground" />
        <MetricCard label="Projects Without PO" value={alerts.length} icon={ShieldAlert} tone="text-destructive" />
      </div>

      <div className="page-gutter mt-4">
        <div className="finance-card">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-8">
            <FilterField label="Search" className="min-w-0 sm:col-span-2 xl:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <input className="finance-input pl-9" placeholder="Search project code, client, site" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} />
              </div>
            </FilterField>
            {filterConfigs.map(({ key, label, allLabel, values }) => (
              <FilterField key={key} label={label} className="min-w-0">
                <select aria-label={label} className="finance-input" value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}>
                  <option value="All">{allLabel}</option>
                  {options(values).map((value) => <option key={value}>{value}</option>)}
                </select>
              </FilterField>
            ))}
            <FilterField label="Start Date From" className="min-w-0">
              <input type="date" className="finance-input" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
            </FilterField>
            <FilterField label="Start Date To" className="min-w-0">
              <input type="date" className="finance-input" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
            </FilterField>
          </div>
        </div>
      </div>

      <div className="page-gutter mt-4 grid gap-4 xl:grid-cols-2">
        <ChartCard title="PO Distribution" chip="This view">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={poBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={88} paddingAngle={4}>
                {poBreakdown.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Funnel" chip="Filtered">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusFunnel} layout="vertical" margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(216 30% 18%)" horizontal vertical={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="stage" width={82} tick={{ fontSize: 11, fill: "#CBD5E1" }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(199 89% 48%)" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="page-gutter mt-4 grid gap-4 xl:grid-cols-2">
        <div className="finance-card">
          <div className="flex justify-between items-center mb-4">
            <div className="section-title">Top Clients</div>
            <div className="finance-chip">Volume</div>
          </div>
          <div className="space-y-3">
            {topClients.length ? topClients.map((client) => <Meter key={client.client} label={client.client} value={client.value} max={topClients[0]?.value} />) : <EmptyLine text="No client data yet" />}
          </div>
        </div>

        <div className="finance-card">
          <div className="flex justify-between items-center mb-4">
            <div className="section-title">Site Performance</div>
            <div className="finance-chip">By output</div>
          </div>
          <div className="space-y-3">
            {filteredSitePerformance.length ? filteredSitePerformance.map((site) => <Meter key={site.site} label={`${site.site} / ${site.completed ?? 0} complete`} value={site.total_projects ?? 0} max={filteredSitePerformance[0]?.total_projects ?? 0} />) : <EmptyLine text="No site performance in this filter" />}
          </div>
        </div>
      </div>

      <div className="page-gutter mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="table-wrap">
          <div className="flex justify-between items-center p-4 border-b border-border">
            <div>
              <div className="text-sm font-bold text-foreground">Project Register</div>
              <div className="text-xs text-muted-foreground mt-1">{rows.length} visible rows</div>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="table-head">
                <tr>
                  {["project_code", "client", "site", "status", "po_id", "po_compliance", "scope_type", "start_date", "completed_date", "duration_days", "actions"].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-3 text-left font-semibold"
                      onClick={() => {
                        if (heading === "project_code" || heading === "status" || heading === "scope_type" || heading === "start_date" || heading === "completed_date" || heading === "duration_days") {
                          setSort(heading as keyof Project);
                        }
                      }}
                    >
                      {heading.replaceAll("_", " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((project) => (
                  <tr key={project.id} className="border-t border-border hover:bg-accent/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold cursor-pointer" onClick={() => setSelected(project)}>{project.project_code}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(project)}>{project.clients?.name ?? "Unspecified"}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(project)}>{project.project_sites?.[0]?.sites?.site_code ?? "Unspecified"}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(project)}>{project.status}</td>
                    <td className="px-4 py-3 font-mono font-semibold cursor-pointer" onClick={() => setSelected(project)}>{poId(project.po_tracking)}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(project)}>{project.po_tracking?.po_compliance_status ?? "-"}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(project)}>{project.scope_type ?? "-"}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(project)}>{project.start_date ?? "-"}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(project)}>{project.completed_date ?? "-"}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelected(project)}>{project.duration_days ?? "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEditForm(project)} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-accent">
                          <Pencil size={12} />
                          Edit
                        </button>
                        <button onClick={() => deleteProject(project)} disabled={isSaving} className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">
                          <Trash2 size={12} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="finance-card">
          <div className="flex justify-between items-center mb-4">
            <div className="section-title">PO Alerts</div>
            <Link to="/alerts" className="text-[11px] font-semibold text-primary">See all</Link>
          </div>
          <div className="space-y-3">
            {alerts.length ? (
              alerts.slice(0, 6).map((project) => (
                <button key={project.id} onClick={() => setSelected(project)} className="w-full text-left rounded-xl border border-border bg-secondary px-4 py-3 hover:bg-accent transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-sm font-semibold text-foreground">{project.project_code}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{getPoAlertLabel(project)}</div>
                    </div>
                    <AlertTriangle size={16} className="text-destructive" />
                  </div>
                </button>
              ))
            ) : (
              <EmptyLine text="No PO alerts in this filtered view" />
            )}
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
              <p className="text-muted-foreground">{selected.description ?? "No description provided."}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Client" value={selected.clients?.name ?? "Unspecified"} />
                <Info label="Site" value={selected.project_sites?.[0]?.sites?.site_code ?? "Unspecified"} />
                <Info label="Country" value={countryName(selected.country)} />
                <Info label="Status" value={selected.status} />
                <Info label="PO ID" value={poId(selected.po_tracking)} />
                <Info label="PO Compliance" value={selected.po_tracking?.po_compliance_status ?? "No PO"} />
              </div>
              {!selected.po_tracking?.po_available && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-destructive font-semibold">
                  {getPoAlertLabel(selected)}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl bg-card border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">{editingProject ? `Edit ${editingProject.project_code}` : "Create project"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project code"><input className="finance-input" value={form.project_code} onChange={(event) => updateForm("project_code", event.target.value)} /></Field>
            <Field label="Status"><select className="finance-input" value={form.status} onChange={(event) => updateForm("status", event.target.value)}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select></Field>
            <Field label="Client"><select className="finance-input" value={form.client_id} onChange={(event) => updateForm("client_id", event.target.value)}><option value="">Unspecified</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Field>
            <Field label="Site"><select className="finance-input" value={form.site_id} onChange={(event) => updateForm("site_id", event.target.value)}><option value="">Unspecified</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.site_code}</option>)}</select></Field>
            <Field label="Country"><input className="finance-input" value={form.country} onChange={(event) => updateForm("country", event.target.value.toUpperCase())} /></Field>
            <Field label="Scope type"><select className="finance-input" value={form.scope_type} onChange={(event) => updateForm("scope_type", event.target.value)}><option value="">Unspecified</option>{scopeOptions.map((option) => <option key={option}>{option}</option>)}</select></Field>
            <Field label="Additional scope count"><input type="number" min="0" className="finance-input" value={form.as_count} onChange={(event) => updateForm("as_count", event.target.value)} /></Field>
            <Field label="PO available"><select className="finance-input" value={form.po_available ? "yes" : "no"} onChange={(event) => updateForm("po_available", event.target.value === "yes")}><option value="no">No</option><option value="yes">Yes</option></select></Field>
            <Field label="Start date"><input type="date" className="finance-input" value={form.start_date} onChange={(event) => updateForm("start_date", event.target.value)} /></Field>
            <Field label="Completed date"><input type="date" className="finance-input" value={form.completed_date} onChange={(event) => updateForm("completed_date", event.target.value)} /></Field>
            <Field label="PO compliance status" className="sm:col-span-2"><select className="finance-input" value={form.po_compliance_status} onChange={(event) => updateForm("po_compliance_status", event.target.value)}>{poStatusOptions.map((option) => <option key={option}>{option}</option>)}</select></Field>
            <Field label="Description" className="sm:col-span-2"><textarea className="finance-input min-h-28" value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsFormOpen(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold">Cancel</button>
            <button onClick={submitProject} disabled={isSaving} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {isSaving ? "Saving..." : editingProject ? "Save changes" : "Create project"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, tone }: { label: string; value: string | number; icon: React.ComponentType<{ size?: number; className?: string }>; tone: string }) {
  return (
    <div className="finance-card relative overflow-hidden">
      <div className="flex justify-between items-start">
        <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</div>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-current/10 ${tone}`}>
          <Icon size={13} />
        </div>
      </div>
      <div className="mt-3 text-2xl font-black tracking-tight text-foreground">{value}</div>
    </div>
  );
}

function ChartCard({ title, chip, children }: { title: string; chip: string; children: React.ReactNode }) {
  return (
    <div className="finance-card">
      <div className="flex justify-between items-center mb-4">
        <div className="section-title">{title}</div>
        <div className="finance-chip">{chip}</div>
      </div>
      {children}
    </div>
  );
}

function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-foreground">{label}</span>
        <span className="text-xs font-bold text-foreground">{value}</span>
      </div>
      <div className="h-1.5 bg-border rounded-full">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(value / Math.max(1, max)) * 100}%` }} />
      </div>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <div className="rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-muted-foreground">{text}</div>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function FilterField({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-2 block text-[11px] font-semibold tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
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
