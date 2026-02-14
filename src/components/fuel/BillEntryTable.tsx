import { useCallback } from 'react';
import { useAppDispatch } from '../../state/app-context.tsx';
import { getFuelByKey } from '../../types/fuel-reference.ts';
import { BillEntryRow } from './BillEntryRow.tsx';
import { Button } from '../ui/Button.tsx';
import { generateId } from '../../utils/format.ts';
import { parsePastedBills } from './PasteHandler.tsx';
import type { FuelSource, BillRecord } from '../../types/index.ts';

interface BillEntryTableProps {
  fuelSource: FuelSource;
}

export function BillEntryTable({ fuelSource }: BillEntryTableProps) {
  const dispatch = useAppDispatch();
  const fuelRef = getFuelByKey(fuelSource.fuel_type);
  const isDelivery = fuelSource.input_mode === 'delivery';

  const addRow = () => {
    const bill: BillRecord = {
      id: generateId(),
      start_date: '',
      end_date: '',
      quantity: 0,
      unit: fuelRef?.unit ?? '',
    };
    dispatch({ type: 'ADD_BILL', payload: { fuelSourceId: fuelSource.id, bill } });
  };

  const updateBill = useCallback((bill: BillRecord) => {
    dispatch({ type: 'UPDATE_BILL', payload: { fuelSourceId: fuelSource.id, bill } });
  }, [dispatch, fuelSource.id]);

  const removeBill = useCallback((billId: string) => {
    dispatch({ type: 'REMOVE_BILL', payload: { fuelSourceId: fuelSource.id, billId } });
  }, [dispatch, fuelSource.id]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text.includes('\t') && !text.includes('\n')) return;

    e.preventDefault();
    const parsed = parsePastedBills(text, isDelivery, fuelRef?.unit ?? '');
    if (parsed.length > 0) {
      dispatch({
        type: 'SET_BILLS',
        payload: {
          fuelSourceId: fuelSource.id,
          bills: [...fuelSource.bills, ...parsed],
        },
      });
    }
  }, [dispatch, fuelSource.id, fuelSource.bills, isDelivery, fuelRef?.unit]);

  // Sort newest-first (reverse chronological)
  const sortedBills = [...fuelSource.bills].sort((a, b) => {
    const dateA = a.start_date || a.end_date;
    const dateB = b.start_date || b.end_date;
    return dateB.localeCompare(dateA);
  });

  return (
    <div onPaste={handlePaste}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-sand-700">
          {isDelivery ? 'Delivery Records' : 'Billing Records'}
          {sortedBills.length > 0 && (
            <span className="text-sand-400 font-normal ml-2">
              ({sortedBills.length} {sortedBills.length === 1 ? 'entry' : 'entries'}, newest first)
            </span>
          )}
        </p>
        <span className="text-xs text-sand-400">Paste from spreadsheet supported</span>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-medium text-sand-500 uppercase tracking-wider">
              <th className="pb-2 pr-2 w-8">#</th>
              {isDelivery ? (
                <>
                  <th className="pb-2 pr-2">Date</th>
                  <th className="pb-2 pr-2">Quantity ({fuelRef?.unit_plural})</th>
                  <th className="pb-2 pr-2">Price/{fuelRef?.unit}</th>
                  <th className="pb-2 pr-2">Total Cost</th>
                </>
              ) : (
                <>
                  <th className="pb-2 pr-2">Start Date</th>
                  <th className="pb-2 pr-2">End Date</th>
                  <th className="pb-2 pr-2">Usage ({fuelRef?.unit_plural})</th>
                  <th className="pb-2 pr-2">Cost</th>
                </>
              )}
              <th className="pb-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {sortedBills.map((bill, index) => (
              <BillEntryRow
                key={bill.id}
                bill={bill}
                isDelivery={isDelivery}
                onUpdate={updateBill}
                onRemove={removeBill}
                rowNumber={index + 1}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {sortedBills.map((bill, index) => (
          <BillEntryRow
            key={bill.id}
            bill={bill}
            isDelivery={isDelivery}
            onUpdate={updateBill}
            onRemove={removeBill}
            rowNumber={index + 1}
            mobile
          />
        ))}
      </div>

      {isDelivery && fuelSource.bills.length > 0 && fuelSource.bills.length < 2 && (
        <p className="text-xs text-sand-500 mt-2 italic">
          Consumption before your first delivery can't be calculated — analysis starts from the second delivery onward.
        </p>
      )}

      <div className="mt-3">
        <Button variant="ghost" size="sm" onClick={addRow}>
          + Add Row
        </Button>
      </div>
    </div>
  );
}
