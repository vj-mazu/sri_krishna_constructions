import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface DatePickerDMYProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  minYear?: number;
  maxYear?: number;
  maxDate?: string; // 'YYYY-MM-DD'
  minDate?: string; // 'YYYY-MM-DD'
  disabled?: boolean;
}

// Convert YYYY-MM-DD to DD-MM-YYYY
const toDisplayFormat = (isoDate: string): string => {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const parts = isoDate.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
  }
  return isoDate;
};

// Convert DD-MM-YYYY (or DD/MM/YYYY) to YYYY-MM-DD
const toIsoFormat = (displayDate: string): string => {
  if (!displayDate || typeof displayDate !== 'string') return '';
  const clean = displayDate.replace(/[\/\.]/g, '-').trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    if (d && m && y && y.length === 4) {
      const dayNum = parseInt(d, 10);
      const monthNum = parseInt(m, 10);
      const yearNum = parseInt(y, 10);
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= 2100) {
        return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      }
    }
  }
  return '';
};

export const DatePickerDMY: React.FC<DatePickerDMYProps> = ({
  value,
  onChange,
  required = false,
  className = '',
  maxDate,
  minDate,
  disabled = false
}) => {
  const [displayText, setDisplayText] = useState(() => toDisplayFormat(value));
  const hiddenDateRef = useRef<HTMLInputElement>(null);

  // Keep display text synchronized when external value changes
  useEffect(() => {
    setDisplayText(toDisplayFormat(value));
  }, [value]);

  // Handle typing numbers directly with automatic mask (DD-MM-YYYY)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 8); // max 8 digits: DDMMYYYY

    let formatted = '';
    if (digitsOnly.length > 0) {
      formatted = digitsOnly.slice(0, 2);
    }
    if (digitsOnly.length >= 3) {
      formatted += '-' + digitsOnly.slice(2, 4);
    }
    if (digitsOnly.length >= 5) {
      formatted += '-' + digitsOnly.slice(4, 8);
    }

    setDisplayText(formatted);

    // If all 8 digits (DD-MM-YYYY) are entered, parse and trigger onChange
    if (digitsOnly.length === 8) {
      const iso = toIsoFormat(formatted);
      if (iso) {
        if (maxDate && iso > maxDate) return;
        if (minDate && iso < minDate) return;
        onChange(iso);
      }
    } else if (digitsOnly.length === 0) {
      onChange('');
    }
  };

  // Validate on blur
  const handleBlur = () => {
    if (!displayText.trim()) {
      onChange('');
      return;
    }
    const iso = toIsoFormat(displayText);
    if (iso) {
      onChange(iso);
      setDisplayText(toDisplayFormat(iso));
    } else {
      // Revert to current valid value if typed date is invalid
      setDisplayText(toDisplayFormat(value));
    }
  };

  // Trigger calendar picker
  const handleOpenCalendar = () => {
    if (disabled) return;
    if (hiddenDateRef.current) {
      try {
        if (typeof hiddenDateRef.current.showPicker === 'function') {
          hiddenDateRef.current.showPicker();
        } else {
          hiddenDateRef.current.focus();
          hiddenDateRef.current.click();
        }
      } catch {
        hiddenDateRef.current.focus();
        hiddenDateRef.current.click();
      }
    }
  };

  // When calendar picker selects a date
  const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (iso) {
      if (maxDate && iso > maxDate) return;
      if (minDate && iso < minDate) return;
      onChange(iso);
      setDisplayText(toDisplayFormat(iso));
    }
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      {/* Formatted Text Input for Typing Numbers & Normal TAB flow */}
      <input
        type="text"
        required={required}
        disabled={disabled}
        value={displayText}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder="DD-MM-YYYY"
        maxLength={10}
        className="w-full pl-3 pr-9 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono transition-all"
        title="Date in DD-MM-YYYY format"
      />

      {/* Calendar Icon Button (tabIndex -1 so TAB key does not get trapped) */}
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={handleOpenCalendar}
        className="absolute right-2 text-slate-400 hover:text-[#1e3a8a] p-1 rounded transition-colors cursor-pointer"
        title="Open calendar picker"
      >
        <Calendar className="w-4 h-4" />
      </button>

      {/* Invisible Native Date Picker for Calendar Selection */}
      <input
        ref={hiddenDateRef}
        type="date"
        tabIndex={-1}
        disabled={disabled}
        min={minDate}
        max={maxDate}
        value={value || ''}
        onChange={handleCalendarChange}
        className="absolute bottom-0 right-0 w-0 h-0 opacity-0 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
};
