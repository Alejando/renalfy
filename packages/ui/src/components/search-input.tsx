import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = 'Buscar...',
  className,
}: SearchInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className={cn('relative flex items-center', className)}>
      <Search className="absolute left-3 h-4 w-4 text-rf-ink-soft pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-4 rounded-rf bg-rf-surface-sunk text-sm text-rf-ink placeholder:text-rf-ink-soft focus:outline-none focus:ring-2 focus:ring-rf-primary/20 focus:bg-white transition-rf"
      />
    </div>
  );
}
