type Cell = string | number | boolean | undefined | null;

function cell(v: Cell): string {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Excel needs the BOM to read Malay/special characters as UTF-8.
export function csvResponse(filename: string, header: string[], rows: Cell[][]) {
  const body = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
