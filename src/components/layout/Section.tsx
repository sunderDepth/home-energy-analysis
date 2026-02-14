import { useState, type ReactNode } from 'react';

interface SectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}

export function Section({ title, subtitle, children, defaultOpen = true, collapsible = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section className="mt-8">
      <div
        className={`flex items-center justify-between mb-4 ${collapsible ? 'cursor-pointer' : ''}`}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div>
          <h2 className="text-lg font-semibold text-sand-900">{title}</h2>
          {subtitle && <p className="text-sm text-sand-500 mt-0.5">{subtitle}</p>}
        </div>
        {collapsible && (
          <svg
            className={`w-5 h-5 text-sand-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
      {isOpen && children}
    </section>
  );
}
