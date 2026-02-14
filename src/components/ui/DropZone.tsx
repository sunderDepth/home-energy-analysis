import { useState, useCallback, type DragEvent } from 'react';

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  accept?: string;
  children?: React.ReactNode;
}

export function DropZone({ onFileDrop, accept = '.json', children }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileDrop(file);
  }, [onFileDrop]);

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) onFileDrop(file);
    };
    input.click();
  }, [onFileDrop, accept]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isDragging
          ? 'border-primary-400 bg-primary-50'
          : 'border-sand-300 hover:border-sand-400 bg-sand-50'
      }`}
    >
      {children || (
        <div className="text-sand-500">
          <p className="text-sm font-medium">Drop a file here, or click to browse</p>
          <p className="text-xs mt-1">Accepts {accept} files</p>
        </div>
      )}
    </div>
  );
}
