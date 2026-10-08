import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface DatePickerDMYProps {
  value: string; // 'YYYY-MM-DD' or ISO string
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  minYear?: number;
  maxYear?: number;
  maxDate?: string; // 'YYYY-MM-DD'
  minDate?: string; // 'YYYY-MM-DD'
  disabled?: boolean;
}

// Convert YYYY-MM-DD or ISO string to DD-MM-YYYY
const toDisplayFormat = (isoDate: string): string => {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const clean = isoDate.includes('T') ? isoDate.split('T')[0] : isoDate.trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const [y, m, d] = parts;
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    } else if (parts[2].length === 4) {
      // Already DD-MM-YYYY
      const [d, m, y] = parts;
      return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
  }
  return clean;
};

// Convert DD-MM-YYYY (or DD/MM/YYYY or YYYY-MM-DD) to YYYY-MM-DD
const toIsoFormat = (displayDate: string): string => {
  if (!displayDate || typeof displayDate !== 'string') return '';
  const clean = displayDate.replace(/[\/\.]/g, '-').trim();
  const parts = clean.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      const [y, m, d] = parts;
      const dayNum = parseInt(d, 10);
      const monthNum = parseInt(m, 10);
      const yearNum = parseInt(y, 10);
      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= 2100) {
        return `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      }
    } else {
      // D-M-YYYY or DD-MM-YYYY
      const [d, m, y] = parts;
      const dayNum = parseInt(d, 10);
      const monthNum = parseInt(m, 10);
      const yearNum = parseInt(y, 10);
      if (y && y.length === 4 && monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31 && yearNum >= 1900 && yearNum <= 2100) {
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
  const nativeInputRef = useRef<HTMLInputElement>(null);

  // Keep display text synchronized when external value changes
  useEffect(() => {
    setDisplayText(toDisplayFormat(value));
  }, [value]);

  // Handle typing numbers directly with flexible formatting
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[\/\.]/g, '-').replace(/[^\d-]/g, '').replace(/-{2,}/g, '-');

    if (!raw.includes('-')) {
      const digits = raw.replace(/\D/g, '').slice(0, 8);
      let formatted = digits;
      if (digits.length > 2) {
        formatted = digits.slice(0, 2) + '-' + digits.slice(2);
      }
      if (digits.length > 4) {
        formatted = digits.slice(0, 2) + '-' + digits.slice(2, 4) + '-' + digits.slice(4, 8);
      }
      setDisplayText(formatted);
      if (digits.length === 8) {
        const iso = toIsoFormat(formatted);
        if (iso) {
          if (maxDate && iso > maxDate) return;
          if (minDate && iso < minDate) return;
          onChange(iso);
        }
      } else if (digits.length === 0) {
        onChange('');
      }
      return;
    }

    setDisplayText(raw);
    const iso = toIsoFormat(raw);
    if (iso) {
      if (maxDate && iso > maxDate) return;
      if (minDate && iso < minDate) return;
      onChange(iso);
    } else if (!raw.trim()) {
      onChange('');
    }
  };

  // Validate on blur
  const handleBlur = () => {
    if (!displayText.trim()) {
      onChange('');
      setDisplayText('');
      return;
    }
    const iso = toIsoFormat(displayText);
    if (iso) {
      if (maxDate && iso > maxDate) {
        setDisplayText(toDisplayFormat(maxDate));
        onChange(maxDate);
        return;
      }
      if (minDate && iso < minDate) {
        setDisplayText(toDisplayFormat(minDate));
        onChange(minDate);
        return;
      }
      onChange(iso);
      setDisplayText(toDisplayFormat(iso));
    } else {
      setDisplayText(toDisplayFormat(value));
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

  const isoValue = toIsoFormat(displayText) || (value ? (value.includes('T') ? value.split('T')[0] : value) : '');

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      {/* Formatted Text Input for Direct Number Typing & Clean TAB navigation */}
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
        title="Date in DD-MM-YYYY format (e.g. 15-04-2026)"
      />

      {/* Visual Calendar Icon */}
      <div className="absolute right-2.5 pointer-events-none text-slate-400">
        <Calendar className="w-4 h-4" />
      </div>

      {/* Native Date Picker transparently overlaid on the icon (tabIndex -1 so TAB skips it) */}
      <input
        ref={nativeInputRef}
        type="date"
        tabIndex={-1}
        disabled={disabled}
        min={minDate}
        max={maxDate}
        value={isoValue}
        onChange={handleCalendarChange}
        onClick={(e) => {
          try {
            if (typeof (e.currentTarget as any).showPicker === 'function') {
              (e.currentTarget as any).showPicker();
            }
          } catch (_) {}
        }}
        className="absolute right-0 top-0 bottom-0 w-9 opacity-0 cursor-pointer z-10"
        title="Open calendar picker"
        aria-label="Open calendar picker"
      />
    </div>
  );
};
