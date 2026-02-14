import type { BillRecord } from '../../types/index.ts';
import { generateId } from '../../utils/format.ts';

/**
 * Parse tab-delimited pasted text into bill records.
 * Handles common formats from spreadsheets and fuel company portals.
 */
export function parsePastedBills(
  text: string,
  isDelivery: boolean,
  unit: string,
): BillRecord[] {
  const lines = text.trim().split('\n').filter(line => line.trim());
  const bills: BillRecord[] = [];

  for (const line of lines) {
    const cols = line.split('\t').map(s => s.trim());

    // Skip header rows (look for common header words)
    if (cols.some(c => /^(date|start|end|quantity|amount|usage|cost|price|gallons|therms|kwh)/i.test(c))) {
      continue;
    }

    try {
      if (isDelivery) {
        // Expected: Date, Quantity [, Price, Cost]
        const date = parseDate(cols[0]);
        const quantity = parseNumber(cols[1]);
        if (!date || !quantity) continue;

        const bill: BillRecord = {
          id: generateId(),
          start_date: date,
          end_date: date,
          quantity,
          unit,
        };

        if (cols.length > 2) {
          const priceOrCost = parseNumber(cols[2]);
          if (priceOrCost) {
            // Heuristic: if the value is < quantity, it's probably a price per unit
            if (priceOrCost < quantity) {
              bill.price_per_unit = priceOrCost;
              bill.cost = priceOrCost * quantity;
            } else {
              bill.cost = priceOrCost;
              bill.price_per_unit = priceOrCost / quantity;
            }
          }
        }
        if (cols.length > 3) {
          const cost = parseNumber(cols[3]);
          if (cost) bill.cost = cost;
        }

        bills.push(bill);
      } else {
        // Expected: Start Date, End Date, Quantity [, Cost]
        const startDate = parseDate(cols[0]);
        const endDate = parseDate(cols[1]);
        const quantity = parseNumber(cols[2]);
        if (!startDate || !endDate || !quantity) continue;

        const bill: BillRecord = {
          id: generateId(),
          start_date: startDate,
          end_date: endDate,
          quantity,
          unit,
        };

        if (cols.length > 3) {
          const cost = parseNumber(cols[3]);
          if (cost) bill.cost = cost;
        }

        bills.push(bill);
      }
    } catch {
      // Skip unparseable rows
      continue;
    }
  }

  return bills;
}

/**
 * Try to parse a date string into ISO format (YYYY-MM-DD).
 */
function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const cleaned = s.replace(/['"$]/g, '').trim();

  // Already ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;

  // US format: MM/DD/YYYY or M/D/YYYY
  const usMatch = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (usMatch) {
    const month = usMatch[1].padStart(2, '0');
    const day = usMatch[2].padStart(2, '0');
    let year = usMatch[3];
    if (year.length === 2) year = (parseInt(year) > 50 ? '19' : '20') + year;
    return `${year}-${month}-${day}`;
  }

  // Try native Date parse as fallback
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Parse a number from a string, stripping currency symbols and commas.
 */
function parseNumber(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[$,'"]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
