import { supabase } from "@/integrations/supabase/client";

export type Project = {
  id: string;
  project_code: string;
  country: string | null;
  description: string | null;
  status: string;
  scope_type: string | null;
  as_count: number;
  start_date: string | null;
  completed_date: string | null;
  duration_days: number | null;
  client_id?: string | null;
  clients?: { name: string } | null;
  po_tracking?: { po_available: boolean; po_compliance_status: string | null } | null;
  project_sites?: { sites?: { id: string; site_code: string; country: string | null } | null }[];
};

export type Site = { id: string; site_code: string; country: string | null };
export type Client = { id: string; name: string };
export type SitePerformance = { site: string; country_id: string | null; total_projects: number; completed: number; total_additional_scope: number };
export type MonthlyTrend = { completed_month: string; country_id: string | null; completions: number; avg_duration: number | null };

export type DashboardData = {
  projects: Project[];
  clients: Client[];
  sites: Site[];
  sitePerformance: SitePerformance[];
  monthlyTrend: MonthlyTrend[];
};

type DashboardCacheEntry = {
  data: DashboardData;
  fetchedAt: number;
};

export const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
export const statusCategory = (status: string) => (status === "Completed" ? "Closed" : status === "Presales" ? "Pipeline" : "In Progress");
export const countryName = (code?: string | null) => ({ SG: "Singapore", MY: "Malaysia", JP: "Japan", HK: "Hong Kong" }[code ?? ""] ?? code ?? "Unspecified");
export const poId = (po?: Project["po_tracking"] | null) => (po?.po_available ? "OK" : po?.po_compliance_status === "Completed without PO" ? "CWOP" : "SWOP");
export const poLabel = (po?: Project["po_tracking"] | null) => (poId(po) === "OK" ? "With PO" : poId(po) === "SWOP" ? "Started without PO" : "Completed without PO");
export const isPoAlertProject = (project: Project) => !project.po_tracking?.po_available;
export const getPoAlertLabel = (project: Project) => `${poId(project.po_tracking)} risk`;

const DASHBOARD_CACHE_KEY = "project-pulse.dashboard-data";
const DASHBOARD_CACHE_TTL = 60_000;

let memoryCache: DashboardCacheEntry | null = null;
let inFlightDashboardRequest: Promise<DashboardData> | null = null;

function getFreshCache(entry: DashboardCacheEntry | null) {
  return entry && Date.now() - entry.fetchedAt < DASHBOARD_CACHE_TTL ? entry.data : null;
}

function readSessionCache(): DashboardData | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as DashboardCacheEntry;
    const data = getFreshCache(parsed);
    if (!data) {
      window.sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
    }
    return data;
  } catch {
    return null;
  }
}

function writeDashboardCache(data: DashboardData) {
  const entry = { data, fetchedAt: Date.now() };
  memoryCache = entry;

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore storage write failures and continue with the in-memory cache.
    }
  }
}

export function invalidateDashboardDataCache() {
  memoryCache = null;
  inFlightDashboardRequest = null;

  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
  }
}

export async function loadDashboardData({ force = false }: { force?: boolean } = {}): Promise<DashboardData> {
  if (!force) {
    const cachedData = getFreshCache(memoryCache) ?? readSessionCache();
    if (cachedData) {
      return cachedData;
    }

    if (inFlightDashboardRequest) {
      return inFlightDashboardRequest;
    }
  }

  const db = supabase as any;
  inFlightDashboardRequest = (async () => {
    const [projectRes, clientRes, siteRes, projectSiteRes, poRes, sitePerfRes, monthlyRes] = await Promise.all([
      db
        .from("projects")
        .select("id,project_code,country,description,status,scope_type,as_count,start_date,completed_date,duration_days,client_id")
        .order("start_date", { ascending: false }),
      db.from("clients").select("id,name").order("name", { ascending: true }),
      db.from("sites").select("id,site_code,country").order("site_code", { ascending: true }),
      db.from("project_sites").select("project_id,site_id"),
      db.from("po_tracking").select("project_id,po_available,po_compliance_status"),
      db.from("vw_site_performance").select("*").order("total_projects", { ascending: false }),
      db.from("vw_monthly_completion_trend").select("*").order("completed_month", { ascending: true }),
    ]);

    const failedResponse = [projectRes, clientRes, siteRes, projectSiteRes, poRes, sitePerfRes, monthlyRes].find((response) => response.error);
    if (failedResponse?.error) {
      throw new Error(failedResponse.error.message);
    }

    const clients = (clientRes.data ?? []) as Client[];
    const sites = (siteRes.data ?? []) as Site[];
    const clientMap = new Map(clients.map((client) => [client.id, { name: client.name }]));
    const siteMap = new Map(sites.map((site) => [site.id, site]));
    const poMap = new Map((poRes.data ?? []).map((item: any) => [item.project_id, { po_available: item.po_available, po_compliance_status: item.po_compliance_status }]));
    const sitesByProject = (projectSiteRes.data ?? []).reduce((acc: Record<string, any[]>, link: any) => {
      acc[link.project_id] = acc[link.project_id] ?? [];
      acc[link.project_id].push({ sites: siteMap.get(link.site_id) });
      return acc;
    }, {});

    const data: DashboardData = {
      clients,
      sites,
      projects: (projectRes.data ?? []).map((project: any) => ({
        ...project,
        clients: clientMap.get(project.client_id) ?? { name: "Unspecified" },
        po_tracking: poMap.get(project.id) ?? { po_available: false, po_compliance_status: "No PO" },
        project_sites: sitesByProject[project.id] ?? [],
      })),
      sitePerformance: sitePerfRes.data ?? [],
      monthlyTrend: monthlyRes.data ?? [],
    };

    writeDashboardCache(data);
    return data;
  })();

  try {
    return await inFlightDashboardRequest;
  } finally {
    inFlightDashboardRequest = null;
  }
}
