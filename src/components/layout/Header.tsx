import { Badge } from '../ui/Badge.tsx';

interface HeaderProps {
  onSaveLoad: () => void;
}

export function Header({ onSaveLoad }: HeaderProps) {
  return (
    <header className="bg-white border-b border-sand-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-sand-900">Home Energy Analyzer</h1>
          <Badge variant="success">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500 mr-1.5" />
            Data stays in your browser
          </Badge>
        </div>
        <button
          onClick={onSaveLoad}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
        >
          Save / Load
        </button>
      </div>
    </header>
  );
}
