import type { BillRecord } from '../../types/index.ts';

interface BillEntryRowProps {
  bill: BillRecord;
  isDelivery: boolean;
  onUpdate: (bill: BillRecord) => void;
  onRemove: (id: string) => void;
  rowNumber: number;
  mobile?: boolean;
}

export function BillEntryRow({
  bill,
  isDelivery,
  onUpdate,
  onRemove,
  rowNumber,
  mobile = false,
}: BillEntryRowProps) {
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const update = (changes: Partial<BillRecord>) => {
    const updated = { ...bill, ...changes };
    // Auto-derive price_per_unit or cost (rounded to avoid floating-point artifacts)
    if (changes.cost !== undefined && updated.quantity > 0 && changes.price_per_unit === undefined) {
      updated.price_per_unit = round2(updated.cost! / updated.quantity);
    } else if (changes.price_per_unit !== undefined && updated.quantity > 0 && changes.cost === undefined) {
      updated.cost = round2(updated.price_per_unit! * updated.quantity);
    } else if (changes.quantity !== undefined && changes.quantity > 0) {
      // Quantity changed — re-derive cost from price_per_unit (or vice versa)
      if (updated.price_per_unit != null) {
        updated.cost = round2(updated.price_per_unit * changes.quantity);
      } else if (updated.cost != null) {
        updated.price_per_unit = round2(updated.cost / changes.quantity);
      }
    }
    onUpdate(updated);
  };

  const inputClass = 'w-full rounded border border-sand-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-transparent';

  if (mobile) {
    return (
      <div className="bg-sand-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-sand-400">#{rowNumber}</span>
          <button
            onClick={() => onRemove(bill.id)}
            className="text-sand-400 hover:text-danger-600 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2">
          {isDelivery ? (
            <div className="flex-1">
              <label className="text-xs text-sand-500">Date</label>
              <input
                type="date"
                value={bill.end_date}
                onChange={e => update({ start_date: e.target.value, end_date: e.target.value })}
                className={inputClass}
              />
            </div>
          ) : (
            <>
              <div className="flex-1">
                <label className="text-xs text-sand-500">Start</label>
                <input
                  type="date"
                  value={bill.start_date}
                  onChange={e => update({ start_date: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-sand-500">End</label>
                <input
                  type="date"
                  value={bill.end_date}
                  onChange={e => update({ end_date: e.target.value })}
                  className={inputClass}
                />
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-sand-500">Quantity</label>
            <input
              type="number"
              step="any"
              min="0"
              value={bill.quantity || ''}
              onChange={e => update({ quantity: parseFloat(e.target.value) || 0 })}
              className={inputClass}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-sand-500">Cost</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={bill.cost != null ? round2(bill.cost) : ''}
              onChange={e => update({ cost: parseFloat(e.target.value) || undefined })}
              className={inputClass}
              placeholder="$"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <tr className="group">
      <td className="py-1.5 pr-2 text-xs text-sand-400 font-medium">#{rowNumber}</td>
      {isDelivery ? (
        <>
          <td className="py-1.5 pr-2">
            <input
              type="date"
              value={bill.end_date}
              onChange={e => update({ start_date: e.target.value, end_date: e.target.value })}
              className={inputClass}
            />
          </td>
          <td className="py-1.5 pr-2">
            <input
              type="number"
              step="any"
              min="0"
              value={bill.quantity || ''}
              onChange={e => update({ quantity: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              placeholder="0"
            />
          </td>
          <td className="py-1.5 pr-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={bill.price_per_unit != null ? round2(bill.price_per_unit) : ''}
              onChange={e => update({ price_per_unit: parseFloat(e.target.value) || undefined })}
              className={inputClass}
              placeholder="$/unit"
            />
          </td>
          <td className="py-1.5 pr-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={bill.cost != null ? round2(bill.cost) : ''}
              onChange={e => update({ cost: parseFloat(e.target.value) || undefined })}
              className={inputClass}
              placeholder="$"
            />
          </td>
        </>
      ) : (
        <>
          <td className="py-1.5 pr-2">
            <input
              type="date"
              value={bill.start_date}
              onChange={e => update({ start_date: e.target.value })}
              className={inputClass}
            />
          </td>
          <td className="py-1.5 pr-2">
            <input
              type="date"
              value={bill.end_date}
              onChange={e => update({ end_date: e.target.value })}
              className={inputClass}
            />
          </td>
          <td className="py-1.5 pr-2">
            <input
              type="number"
              step="any"
              min="0"
              value={bill.quantity || ''}
              onChange={e => update({ quantity: parseFloat(e.target.value) || 0 })}
              className={inputClass}
              placeholder="0"
            />
          </td>
          <td className="py-1.5 pr-2">
            <input
              type="number"
              step="0.01"
              min="0"
              value={bill.cost != null ? round2(bill.cost) : ''}
              onChange={e => update({ cost: parseFloat(e.target.value) || undefined })}
              className={inputClass}
              placeholder="$"
            />
          </td>
        </>
      )}
      <td className="py-1.5">
        <button
          onClick={() => onRemove(bill.id)}
          className="opacity-0 group-hover:opacity-100 text-sand-400 hover:text-danger-600 transition-opacity cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  );
}
