import Papa from 'papaparse';
import { BusinessLead } from './FirecrawlService';

export class ExportService {
  static exportToCSV(leads: BusinessLead[], filename: string = 'business-leads.csv'): void {
    const csvData = Papa.unparse(leads, {
      header: true,
      columns: ['name', 'email', 'phone', 'website', 'address', 'description', 'source']
    });

    this.downloadFile(csvData, filename, 'text/csv');
  }

  static exportToJSON(leads: BusinessLead[], filename: string = 'business-leads.json'): void {
    const jsonData = JSON.stringify(leads, null, 2);
    this.downloadFile(jsonData, filename, 'application/json');
  }

  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}