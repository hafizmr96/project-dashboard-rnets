CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_code TEXT NOT NULL,
  country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_code, country)
);

CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_code TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  country TEXT,
  description TEXT,
  status TEXT NOT NULL,
  scope_type TEXT,
  as_count INTEGER NOT NULL DEFAULT 0,
  start_date DATE,
  completed_date DATE,
  duration_days INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN start_date IS NOT NULL AND completed_date IS NOT NULL THEN completed_date - start_date
      ELSE NULL
    END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT projects_scope_type_check CHECK (scope_type IS NULL OR scope_type IN ('Original', 'Additional')),
  CONSTRAINT projects_as_count_check CHECK (as_count >= 0)
);

CREATE TABLE public.project_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, site_id)
);

CREATE TABLE public.po_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  po_available BOOLEAN NOT NULL DEFAULT false,
  po_compliance_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.project_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  month_start DATE,
  month_complete DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_scope_type ON public.projects(scope_type);
CREATE INDEX idx_projects_start_date ON public.projects(start_date);
CREATE INDEX idx_project_sites_project_id ON public.project_sites(project_id);
CREATE INDEX idx_project_sites_site_id ON public.project_sites(site_id);
CREATE INDEX idx_po_tracking_project_id ON public.po_tracking(project_id);
CREATE INDEX idx_project_metrics_month_start ON public.project_metrics(month_start);
CREATE INDEX idx_project_metrics_month_complete ON public.project_metrics(month_complete);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_po_tracking_updated_at
BEFORE UPDATE ON public.po_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dashboard can view clients"
ON public.clients
FOR SELECT
USING (true);

CREATE POLICY "Dashboard can view sites"
ON public.sites
FOR SELECT
USING (true);

CREATE POLICY "Dashboard can view projects"
ON public.projects
FOR SELECT
USING (true);

CREATE POLICY "Dashboard can view project sites"
ON public.project_sites
FOR SELECT
USING (true);

CREATE POLICY "Dashboard can view PO tracking"
ON public.po_tracking
FOR SELECT
USING (true);

CREATE POLICY "Dashboard can view project metrics"
ON public.project_metrics
FOR SELECT
USING (true);