export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
): string {
  const header = columns.map((c) => escapeCsv(c.label)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => escapeCsv(String(row[c.key] ?? ""))).join(","),
  );
  return [header, ...body].join("\r\n");
}

function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
