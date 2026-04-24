import { createFileRoute } from "@tanstack/react-router";

const dimensions = [
  { title: "DIM_COUNTRY", columns: [["SG", "Singapore"], ["MY", "Malaysia"], ["JP", "Japan"], ["HK", "Hong Kong"]] },
  { title: "DIM_CLIENT", columns: [["TEL", "Telstra"], ["SUB", "Subsea"], ["OTH", "Other/Unspecified"]] },
  { title: "DIM_STATUS", columns: [["COMP", "Completed / Closed"], ["PRE", "Presales / Pipeline"], ["G1-G6", "In Progress"]] },
  { title: "DIM_SCOPE", columns: [["ORI", "Original"], ["ADD", "Additional"]] },
  { title: "DIM_PO_STATUS", columns: [["OK", "PO available"], ["SWOP", "Started without PO"], ["CWOP", "Completed without PO"]] },
];

const factFields = ["Project_Code", "Country_ID", "Client_ID", "Project_Description", "Site", "Status_ID", "PO_Availability", "PO_ID", "PO_Compliance", "Scope_ID", "AS_Count", "Start_Date", "Start_Month", "Completed_Date", "Completed_Month", "Duration_Days"];
const kpis = [
  ["Total Projects", "COUNT(Project Code)", "Volume"],
  ["Completed Projects", "COUNTIF(Status='Completed')", "Volume"],
  ["In Progress Projects", "COUNTIF(Status LIKE 'G%')", "Volume"],
  ["Presales Projects", "COUNTIF(Status='Presales')", "Pipeline"],
  ["Completion Rate", "Completed / Total * 100", "Performance"],
  ["PO Compliance Rate", "COUNTIF(PO_Availability='Yes') / Total", "Compliance"],
  ["SWOP Count", "COUNTIF(PO_Compliance='Started without PO')", "Compliance"],
  ["CWOP Count", "COUNTIF(PO_Compliance='Completed without PO')", "Compliance"],
  ["Avg Duration (Days)", "AVG(Completed_Date - Start_Date)", "Performance"],
  ["Site Utilization", "GROUP BY Site", "Operations"],
];
const views = [
  ["vw_project_summary", "Country_ID, Client_ID, Status_Category, Project_Count, With_PO"],
  ["vw_monthly_completion_trend", "Completed_Month, Country_ID, Completions, Avg_Duration"],
  ["vw_site_performance", "Site, Country_ID, Total_Projects, Completed, Total_Additional_Scope"],
];

export const Route = createFileRoute("/data-dictionary")({ component: DataDictionaryPage });

function DataDictionaryPage() {
  return (
    <div className="app-page">
      <div className="shell-topbar">
        <div>
          <div className="text-xs text-muted-foreground font-medium">Schema reference</div>
          <div className="text-2xl font-black text-foreground tracking-tight">Data Dictionary</div>
        </div>
      </div>

      <div className="page-gutter mt-4 grid gap-4 lg:grid-cols-5">
        {dimensions.map((dimension) => (
          <article key={dimension.title} className="finance-card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-secondary">
              <h2 className="text-sm font-black tracking-wide text-foreground">{dimension.title}</h2>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {dimension.columns.map((row) => (
                  <tr key={row[0]} className="border-t border-border">
                    <td className="px-4 py-3 font-mono font-semibold">{row[0]}</td>
                    <td className="px-4 py-3">{row[1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </div>

      <div className="page-gutter mt-4">
        <section className="table-wrap">
          <div className="flex justify-between items-center p-4 border-b border-border">
            <div>
              <div className="section-title">Fact Projects</div>
              <div className="text-xs text-muted-foreground mt-1">Main transaction table definition</div>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead className="table-head">
                <tr>{factFields.map((field) => <th key={field} className="border-r border-border px-3 py-3 text-left font-semibold">{field}</th>)}</tr>
              </thead>
              <tbody>
                <tr>{factFields.map((field) => <td key={field} className="border-r border-t border-border px-3 py-3 font-mono text-xs">{field.includes("Date") ? "DATE" : field === "AS_Count" || field === "Duration_Days" ? "INT" : "VARCHAR"}</td>)}</tr>
                <tr>{factFields.map((field) => <td key={field} className="border-r border-t border-border px-3 py-3 text-xs text-muted-foreground">{field === "Project_Code" ? "PK" : field.endsWith("_ID") ? "FK" : field === "Duration_Days" ? "Calculated" : "Source"}</td>)}</tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="page-gutter mt-4 grid gap-4 xl:grid-cols-2">
        <ReferenceCard title="Dashboard KPIs" headings={["KPI Name", "Formula / Calculation", "Category"]} rows={kpis} />
        <ReferenceCard title="SQL Views" headings={["View", "Output Columns"]} rows={views} />
      </div>
    </div>
  );
}

function ReferenceCard({ title, headings, rows }: { title: string; headings: string[]; rows: string[][] }) {
  return (
    <section className="table-wrap">
      <div className="flex justify-between items-center p-4 border-b border-border">
        <div className="section-title">{title}</div>
      </div>
      <table className="w-full text-sm">
        <thead className="table-head">
          <tr>{headings.map((heading) => <th key={heading} className="px-3 py-3 text-left font-semibold">{heading}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")} className="border-t border-border">
              {row.map((cell) => <td key={cell} className="px-3 py-3">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
