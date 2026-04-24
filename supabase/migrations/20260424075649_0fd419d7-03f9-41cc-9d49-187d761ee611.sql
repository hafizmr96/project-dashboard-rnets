CREATE OR REPLACE VIEW public.vw_project_summary AS
SELECT
  p.country AS country_id,
  COALESCE(c.name, 'Unspecified') AS client_name,
  CASE
    WHEN p.status = 'Completed' THEN 'Closed'
    WHEN p.status = 'Presales' THEN 'Pipeline'
    ELSE 'In Progress'
  END AS status_category,
  COUNT(*)::integer AS project_count,
  SUM(CASE WHEN COALESCE(po.po_available, false) THEN 1 ELSE 0 END)::integer AS with_po
FROM public.projects p
LEFT JOIN public.clients c ON c.id = p.client_id
LEFT JOIN public.po_tracking po ON po.project_id = p.id
GROUP BY p.country, COALESCE(c.name, 'Unspecified'), CASE
    WHEN p.status = 'Completed' THEN 'Closed'
    WHEN p.status = 'Presales' THEN 'Pipeline'
    ELSE 'In Progress'
  END;

CREATE OR REPLACE VIEW public.vw_monthly_completion_trend AS
SELECT
  pm.month_complete AS completed_month,
  p.country AS country_id,
  COUNT(*)::integer AS completions,
  ROUND(AVG(p.duration_days))::integer AS avg_duration
FROM public.projects p
LEFT JOIN public.project_metrics pm ON pm.project_id = p.id
WHERE p.status = 'Completed' AND pm.month_complete IS NOT NULL
GROUP BY pm.month_complete, p.country;

CREATE OR REPLACE VIEW public.vw_site_performance AS
SELECT
  COALESCE(s.site_code, 'Unspecified') AS site,
  COALESCE(s.country, p.country) AS country_id,
  COUNT(*)::integer AS total_projects,
  SUM(CASE WHEN p.status = 'Completed' THEN 1 ELSE 0 END)::integer AS completed,
  SUM(CASE WHEN p.scope_type = 'Additional' THEN p.as_count ELSE 0 END)::integer AS total_additional_scope
FROM public.projects p
LEFT JOIN public.project_sites ps ON ps.project_id = p.id
LEFT JOIN public.sites s ON s.id = ps.site_id
GROUP BY COALESCE(s.site_code, 'Unspecified'), COALESCE(s.country, p.country);

GRANT SELECT ON public.vw_project_summary TO anon, authenticated;
GRANT SELECT ON public.vw_monthly_completion_trend TO anon, authenticated;
GRANT SELECT ON public.vw_site_performance TO anon, authenticated;