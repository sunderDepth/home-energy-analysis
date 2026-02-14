import { useCallback, useState } from 'react';
import { useAppState, useAppDispatch } from '../../state/app-context.tsx';
import { Card, CardHeader, CardBody } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { DropZone } from '../ui/DropZone.tsx';
import { validateImport } from './ImportValidator.tsx';
import type { SessionState } from '../../types/index.ts';

const APP_VERSION = '1.0.0';

interface ExportImportPanelProps {
  onClose: () => void;
}

export function ExportImportPanel({ onClose }: ExportImportPanelProps) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const exportJSON = useCallback(() => {
    const session: SessionState = {
      version: APP_VERSION,
      exported_at: new Date().toISOString(),
      location: state.location,
      degree_day_config: state.degreeDayConfig,
      fuel_sources: state.fuelSources,
      weather_data_hash: state.weatherData?.hash,
    };

    const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const zip = state.location?.zip_code ?? 'unknown';
    const date = new Date().toISOString().slice(0, 10);
    a.download = `energy-analysis-${zip}-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  const exportCSV = useCallback(() => {
    for (const fs of state.fuelSources) {
      const isDelivery = fs.input_mode === 'delivery';
      const headers = isDelivery
        ? ['Date', 'Quantity', 'Unit', 'Price Per Unit', 'Total Cost']
        : ['Start Date', 'End Date', 'Quantity', 'Unit', 'Cost'];

      const rows = fs.bills.map(b => {
        if (isDelivery) {
          return [b.end_date, b.quantity, b.unit, b.price_per_unit ?? '', b.cost ?? ''];
        }
        return [b.start_date, b.end_date, b.quantity, b.unit, b.cost ?? ''];
      });

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fs.label.replace(/\s+/g, '-').toLowerCase()}-bills.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [state.fuelSources]);

  const handleImport = useCallback(async (file: File) => {
    setImportError(null);
    setImportSuccess(false);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const validation = validateImport(data);

      if (!validation.valid) {
        setImportError(validation.errors.join('. '));
        return;
      }

      dispatch({
        type: 'IMPORT_SESSION',
        payload: data,
      });

      onClose();
    } catch {
      setImportError('Unable to read file. Please ensure it is a valid JSON file.');
    }
  }, [dispatch]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex items-center justify-between">
          <h3 className="font-semibold text-sand-900">Save / Load Analysis</h3>
          <button onClick={onClose} className="text-sand-400 hover:text-sand-600 cursor-pointer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <p className="text-sm font-medium text-sand-700 mb-2">Export</p>
            <div className="flex gap-2">
              <Button onClick={exportJSON} size="sm">
                Export as JSON
              </Button>
              {state.fuelSources.length > 0 && (
                <Button variant="secondary" onClick={exportCSV} size="sm">
                  Export Bills as CSV
                </Button>
              )}
            </div>
            <p className="text-xs text-sand-500 mt-1">
              JSON includes all data for full round-trip. CSV exports bill data only.
            </p>
          </div>

          <div className="border-t border-sand-100 pt-4">
            <p className="text-sm font-medium text-sand-700 mb-2">Import</p>
            <DropZone onFileDrop={handleImport} accept=".json">
              <div className="text-sand-500">
                <p className="text-sm font-medium">Drop a JSON file here, or click to browse</p>
                <p className="text-xs mt-1">Restores a previously exported analysis</p>
              </div>
            </DropZone>
            {importError && (
              <p className={`text-xs mt-2 ${importSuccess ? 'text-accent-600' : 'text-danger-600'}`}>
                {importError}
              </p>
            )}
            {importSuccess && !importError && (
              <p className="text-xs text-primary-600 mt-2">Analysis imported successfully.</p>
            )}
          </div>

          <div className="border-t border-sand-100 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('This will clear all data. Are you sure?')) {
                  dispatch({ type: 'RESET' });
                  onClose();
                }
              }}
              className="text-danger-600"
            >
              Clear All Data
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
