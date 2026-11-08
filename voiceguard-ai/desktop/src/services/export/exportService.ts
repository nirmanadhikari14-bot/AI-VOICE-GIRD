/**
 * Desktop Export Service
 * Exports data as CSV or JSON via Electron IPC (native Save dialog) or browser fallback.
 */

function triggerBrowserDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function saveFile(content: string, filename: string, mimeType: string): Promise<boolean> {
  if (window.voiceguardDesktop?.exportData) {
    const res = await window.voiceguardDesktop.exportData({ filename, content, mimeType });
    return res.success;
  }
  triggerBrowserDownload(content, filename, mimeType);
  return true;
}

export const exportService = {
  /**
   * Export an array of objects as CSV.
   * Usage: exportService.exportCsv(dataArray, filename)
   */
  async exportCsv(data: Record<string, unknown>[], filename: string): Promise<boolean> {
    if (!data || data.length === 0) {
      return saveFile('', filename.endsWith('.csv') ? filename : `${filename}.csv`, 'text/csv');
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((h) => {
            const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\n');
    return saveFile(
      csvContent,
      filename.endsWith('.csv') ? filename : `${filename}.csv`,
      'text/csv;charset=utf-8;'
    );
  },

  /**
   * Export any value as pretty-printed JSON.
   * Usage: exportService.exportJson(data, filename)
   */
  async exportJson(data: unknown, filename: string): Promise<boolean> {
    const jsonContent = JSON.stringify(data, null, 2);
    return saveFile(
      jsonContent,
      filename.endsWith('.json') ? filename : `${filename}.json`,
      'application/json;charset=utf-8;'
    );
  },
};

export type ExportService = typeof exportService;
