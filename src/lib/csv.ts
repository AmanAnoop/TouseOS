export type CsvValue = string | number | boolean | null | undefined;

export function toCsv<T extends Record<string, CsvValue>>(
  rows: T[],
  columns: Array<{ key: keyof T; label: string }>,
): string {
  const escape = (value: CsvValue) => {
    const normalized = value === null || value === undefined ? "" : String(value);
    return `"${normalized.replaceAll('"', '""')}"`;
  };

  const header = columns.map((column) => escape(column.label)).join(",");
  const body = rows.map((row) => columns.map((column) => escape(row[column.key])).join(","));
  return [header, ...body].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
