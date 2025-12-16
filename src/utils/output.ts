import * as fs from 'fs';
import * as path from 'path';

export interface TransactionResult {
    txId?: string;
    latency?: number;
    fee?: number;
}

export async function exportToCSV(results: TransactionResult[], network: string): Promise<void> {
    const csvContent = resultsToCSV(results);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const csvPath = `${network}-${timestamp}.csv`;
    await writeCSV(csvPath, csvContent);
}

export function resultsToCSV(results: TransactionResult[]): string {
  return [
  'tx_id,latency_ms,fee',
  ...results.map(r => `${r.txId},${r.latency},${r.fee}`)
].join('\n');
}

export async function writeCSV(filePath: string, csvContent: string): Promise<void> {
  const dir = "./results";

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fullPath = path.join(dir, filePath);
  fs.writeFileSync(fullPath, csvContent);
  console.log(`✓ CSV output written to: ${fullPath}`);
}
