import ExcelJS from "exceljs";

export async function toExcelBuffer<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; label: string }[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Export");

  sheet.columns = columns.map((c) => ({ header: c.label, key: String(c.key), width: 26 }));
  for (const row of rows) {
    const mapped: Record<string, unknown> = {};
    for (const c of columns) mapped[String(c.key)] = row[c.key] ?? "";
    sheet.addRow(mapped);
  }
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEF2F5" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
