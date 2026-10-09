import * as XLSX from 'xlsx';

/**
 * Export an array of flat objects to an .xlsx file, downloaded in-browser.
 * @param {Array<Object>} rows - data rows (already shaped for display)
 * @param {string} filename - without extension
 * @param {string} sheetName
 */
export function exportToExcel(rows, filename = 'export', sheetName = 'Sheet1') {
  const data = rows && rows.length ? rows : [{ Info: 'No data for current filters' }];
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto width columns (rough heuristic based on content length)
  const colWidths = Object.keys(data[0]).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...data.map((row) => (row[key] === undefined || row[key] === null ? 0 : String(row[key]).length)),
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 45) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filename}_${stamp}.xlsx`);
}
