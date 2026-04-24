import { createFileRoute } from "@tanstack/react-router";

const dimensions = [
  { title: "DIM_COUNTRY", columns: [["SG", "Singapore"], ["MY", "Malaysia"], ["JP", "Japan"], ["HK", "Hong Kong"]] },
  { title: "DIM_CLIENT", columns: [["TEL", "Telstra"], ["SUB", "Subsea"], ["OTH", "Other/Unspecified"]] },
  { title: "DIM_STATUS", columns: [["COMP", "Completed / Closed"], ["PRE", "Presales / Pipeline"], ["G1-G6", "In Progress"]] },
  { title: "DIM_SCOPE", columns: [["ORI", "Original"], ["ADD", "Additional"]] },
  { title: "DIM_PO_STATUS", columns: [["OK", "PO available"], ["SWOP", "Started without PO"], ["CWOP", "Completed without PO"]] },
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

    </div>
  );
}
