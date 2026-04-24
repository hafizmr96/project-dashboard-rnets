import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import {
  Client,
  DashboardData,
  invalidateDashboardDataCache,
  loadDashboardData as fetchDashboardData,
  Project,
  Site,
  SitePerformance,
} from "@/lib/project-data";

export type DashboardFilters = {
  q: string;
  client: string;
  country: string;
  site: string;
  status: string;
  scope: string;
  from: string;
  to: string;
};

export type DashboardSort = keyof Project;
export type DashboardDetailTarget = "dashboard" | "alerts" | null;

export type DashboardStoreState = DashboardData & {
  filters: DashboardFilters;
  sort: DashboardSort;
  selectedProjectId: string | null;
  detailTarget: DashboardDetailTarget;
  isLoading: boolean;
  error: string | null;
  hasLoaded: boolean;
  lastLoadedAt: number | null;
};

export type DashboardStoreActions = {
  loadDashboardData: (options?: { force?: boolean }) => Promise<void>;
  refreshDashboardData: () => Promise<void>;
  setFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => void;
  resetFilters: () => void;
  setSort: (sort: DashboardSort) => void;
  selectProject: (projectId: string, target: Exclude<DashboardDetailTarget, null>) => void;
  clearSelection: () => void;
};

type DashboardStore = DashboardStoreState & DashboardStoreActions;

const DEFAULT_FILTERS: DashboardFilters = {
  q: "",
  client: "All",
  country: "All",
  site: "All",
  status: "All",
  scope: "All",
  from: "",
  to: "",
};

const EMPTY_DASHBOARD_DATA: DashboardData = {
  projects: [],
  clients: [],
  sites: [],
  sitePerformance: [],
};

const noopStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function buildDataState(data: DashboardData, currentState: DashboardStoreState) {
  const selectionStillExists = currentState.selectedProjectId && data.projects.some((project) => project.id === currentState.selectedProjectId);

  return {
    ...data,
    selectedProjectId: selectionStillExists ? currentState.selectedProjectId : null,
    detailTarget: selectionStillExists ? currentState.detailTarget : null,
    isLoading: false,
    error: null,
    hasLoaded: true,
    lastLoadedAt: Date.now(),
  };
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set, get) => ({
      ...EMPTY_DASHBOARD_DATA,
      filters: DEFAULT_FILTERS,
      sort: "start_date",
      selectedProjectId: null,
      detailTarget: null,
      isLoading: false,
      error: null,
      hasLoaded: false,
      lastLoadedAt: null,

      async loadDashboardData(options) {
        const force = options?.force ?? false;
        const state = get();

        if (state.isLoading) return;
        if (!force && state.hasLoaded) return;

        set({ isLoading: true, error: null });

        try {
          const data = await fetchDashboardData({ force });
          set((currentState) => buildDataState(data, currentState));
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : "Failed to load dashboard data.",
          });
          throw error;
        }
      },

      async refreshDashboardData() {
        invalidateDashboardDataCache();
        await get().loadDashboardData({ force: true });
      },

      setFilter(key, value) {
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: value,
          },
        }));
      },

      resetFilters() {
        set({ filters: DEFAULT_FILTERS });
      },

      setSort(sort) {
        set({ sort });
      },

      selectProject(projectId, target) {
        set({
          selectedProjectId: projectId,
          detailTarget: target,
        });
      },

      clearSelection() {
        set({
          selectedProjectId: null,
          detailTarget: null,
        });
      },
    }),
    {
      name: "project-pulse.dashboard-controls",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? window.localStorage : noopStorage)),
      partialize: (state) => ({
        filters: state.filters,
        sort: state.sort,
      }),
    },
  ),
);

export function useDashboardFilters() {
  return useDashboardStore((state) => state.filters);
}

export function useDashboardDataStatus() {
  return useDashboardStore(
    useShallow((state) => ({
      isLoading: state.isLoading,
      error: state.error,
      hasLoaded: state.hasLoaded,
      lastLoadedAt: state.lastLoadedAt,
      loadDashboardData: state.loadDashboardData,
      refreshDashboardData: state.refreshDashboardData,
    })),
  );
}

export function useDashboardControls() {
  return useDashboardStore(
    useShallow((state) => ({
      filters: state.filters,
      sort: state.sort,
      setFilter: state.setFilter,
      resetFilters: state.resetFilters,
      setSort: state.setSort,
      selectProject: state.selectProject,
      clearSelection: state.clearSelection,
    })),
  );
}

export function useDashboardEntities() {
  return useDashboardStore(
    useShallow((state) => ({
      projects: state.projects,
      clients: state.clients,
      sites: state.sites,
      sitePerformance: state.sitePerformance,
    })),
  );
}

export function useSelectedProject(target?: Exclude<DashboardDetailTarget, null>) {
  return useDashboardStore((state) => {
    if (target && state.detailTarget !== target) return null;
    if (!state.selectedProjectId) return null;
    return state.projects.find((project) => project.id === state.selectedProjectId) ?? null;
  });
}
