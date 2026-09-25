import React, { useMemo } from 'react';

interface DatePickerDMYProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
}

const MONTHS = [
  { value: '01', label: '01 - Jan' },
  { value: '02', label: '02 - Feb' },
  { value: '03', label: '03 - Mar' },
  { value: '04', label: '04 - Apr' },
  { value: '05', label: '05 - May' },
  { value: '06', label: '06 - Jun' },
  { value: '07', label: '07 - Jul' },
  { value: '08', label: '08 - Aug' },
  { value: '09', label: '09 - Sep' },
  { value: '10', label: '10 - Oct' },
  { value: '11', label: '11 - Nov' },
  { value: '12', label: '12 - Dec' }
];

export const DatePickerDMY: React.FC<DatePickerDMYProps> = ({
  value,
  onChange,
  required = false,
  className = '',
  minYear = 2020,
  maxYear = 2035,
  disabled = false
}) => {
  // Parse incoming YYYY-MM-DD
  const { day, month, year } = useMemo(() => {
    if (!value || typeof value !== 'string') {
      return { day: '', month: '', year: '' };
    }
    const parts = value.split('-');
    if (parts.length === 3) {
      return {
        year: parts[0] || '',
        month: parts[1] || '',
        day: parts[2] || ''
      };
    }
    return { day: '', month: '', year: '' };
  }, [value]);

  // Compute number of days in selected month/year
  const daysInMonth = useMemo(() => {
    const y = parseInt(year, 10) || 2026;
    const m = parseInt(month, 10) || 1;
    return new Date(y, m, 0).getDate();
  }, [year, month]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [minYear, maxYear]);

  const handleDayChange = (newDay: string) => {
    const d = newDay.padStart(2, '0');
    const m = month || '01';
    const y = year || String(new Date().getFullYear());
    onChange(`${y}-${m}-${d}`);
  };

  const handleMonthChange = (newMonth: string) => {
    const m = newMonth.padStart(2, '0');
    const y = year || String(new Date().getFullYear());
    let d = day || '01';
    const maxD = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    if (parseInt(d, 10) > maxD) {
      d = String(maxD).padStart(2, '0');
    }
    onChange(`${y}-${m}-${d}`);
  };

  const handleYearChange = (newYear: string) => {
    const y = newYear;
    const m = month || '01';
    let d = day || '01';
    const maxD = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    if (parseInt(d, 10) > maxD) {
      d = String(maxD).padStart(2, '0');
    }
    onChange(`${y}-${m}-${d}`);
  };

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {/* Day Select */}
      <select
        required={required}
        disabled={disabled}
        value={day}
        onChange={(e) => handleDayChange(e.target.value)}
        className="w-16 p-1.5 sm:p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
        title="Day (DD)"
      >
        <option value="">DD</option>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const val = String(i + 1).padStart(2, '0');
          return (
            <option key={val} value={val}>
              {val}
            </option>
          );
        })}
      </select>

      {/* Month Select */}
      <select
        required={required}
        disabled={disabled}
        value={month}
        onChange={(e) => handleMonthChange(e.target.value)}
        className="w-28 p-1.5 sm:p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none"
        title="Month (MM)"
      >
        <option value="">Month</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      {/* Year Select */}
      <select
        required={required}
        disabled={disabled}
        value={year}
        onChange={(e) => handleYearChange(e.target.value)}
        className="w-20 p-1.5 sm:p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]/20 outline-none font-mono"
        title="Year (YYYY)"
      >
        <option value="">YYYY</option>
        {years.map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>

      {/* Direct Calendar Picker Button / Fallback */}
      <input
        type="date"
        disabled={disabled}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 p-1 opacity-60 hover:opacity-100 cursor-pointer border border-slate-300 rounded-lg bg-slate-50 text-xs shrink-0"
        title="Pick from calendar"
      />
    </div>
  );
};
