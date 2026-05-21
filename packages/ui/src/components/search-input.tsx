import * as React from 'react';
import { Input } from './input';
import { Button } from './button';
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
    <div className={cn('flex items-center gap-3', className)}>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button variant="secondary" onClick={onSearch} aria-label="Buscar">
        Buscar
      </Button>
    </div>
  );
}
