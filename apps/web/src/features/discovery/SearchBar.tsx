/**
 * features/discovery/SearchBar.tsx
 * Debounced keyword search: calls onSearch 300ms after the customer stops typing.
 */
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';

interface SearchBarProps {
  value: string;
  onSearch: (value: string) => void;
}

const DEBOUNCE_MS = 300;

export function SearchBar({ value, onSearch }: SearchBarProps) {
  const [text, setText] = useState(value);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  // Follow outside changes (e.g. browser back/forward).
  useEffect(() => setText(value), [value]);

  useEffect(() => {
    if (text.trim() === value) return;
    const id = setTimeout(() => onSearchRef.current(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text, value]);

  return (
    <div className="flex h-14 items-center gap-4 rounded-lg border border-line-strong bg-surface-card px-4 focus-within:border-accent">
      <label htmlFor="event-search" className="sr-only">
        Search events
      </label>
      <Icon name="search" size={24} className="text-fg-muted" />
      <input
        id="event-search"
        type="search"
        value={text}
        maxLength={100}
        placeholder="Search events or venues"
        onChange={(e) => setText(e.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent text-base leading-[1.5] text-fg placeholder:text-fg-muted focus:outline-none"
      />
    </div>
  );
}
