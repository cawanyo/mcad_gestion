'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Phone, Search } from 'lucide-react';

export interface Country {
  code: string;       // ISO 2
  name: string;
  dialCode: string;   // e.g. +33
  flag: string;       // Emoji flag
}

export const COUNTRIES: Country[] = [
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', flag: '🇨🇮' },
  { code: 'CD', name: 'RD Congo', dialCode: '+243', flag: '🇨🇩' },
  { code: 'BE', name: 'Belgique', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Suisse', dialCode: '+41', flag: '🇨🇭' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'SN', name: 'Sénégal', dialCode: '+221', flag: '🇸🇳' },
  { code: 'CM', name: 'Cameroun', dialCode: '+237', flag: '🇨🇲' },
  { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦' },
  { code: 'TG', name: 'Togo', dialCode: '+228', flag: '🇹🇬' },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', flag: '🇧🇯' },
  { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬' },
  { code: 'GN', name: 'Guinée', dialCode: '+224', flag: '🇬🇳' },
  { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', flag: '🇧🇫' },
  { code: 'MG', name: 'Madagascar', dialCode: '+261', flag: '🇲🇬' },
  { code: 'HT', name: 'Haïti', dialCode: '+509', flag: '🇭🇹' },
  { code: 'US', name: 'États-Unis', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'Royaume-Uni', dialCode: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Allemagne', dialCode: '+49', flag: '🇩🇪' },
  { code: 'IT', name: 'Italie', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Espagne', dialCode: '+34', flag: '🇪🇸' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352', flag: '🇱🇺' },
];

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (fullPhone: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export const PhoneInputWithCountry: React.FC<PhoneInputWithCountryProps> = ({
  value,
  onChange,
  placeholder = '6 12 34 56 78',
  required = true,
  className = '',
  autoFocus = false,
}) => {
  // Try to parse existing value into country + national number
  const findCountryFromValue = (val: string): { country: Country; national: string } => {
    if (!val) return { country: COUNTRIES[0], national: '' };
    
    // Check if starts with a known dial code
    const cleaned = val.trim();
    for (const c of COUNTRIES) {
      if (cleaned.startsWith(c.dialCode)) {
        const national = cleaned.slice(c.dialCode.length).trim();
        return { country: c, national };
      }
    }
    return { country: COUNTRIES[0], national: val };
  };

  const initial = findCountryFromValue(value);
  const [selectedCountry, setSelectedCountry] = useState<Country>(initial.country);
  const [nationalNumber, setNationalNumber] = useState<string>(initial.national);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync with prop changes if value is changed externally
  useEffect(() => {
    const parsed = findCountryFromValue(value);
    setSelectedCountry(parsed.country);
    setNationalNumber(parsed.national);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleCountrySelect = (c: Country) => {
    setSelectedCountry(c);
    setIsOpen(false);
    setSearchQuery('');
    
    const formatted = nationalNumber.trim() ? `${c.dialCode} ${nationalNumber.trim()}` : c.dialCode;
    onChange(formatted);
  };

  const handleNationalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value;
    // Allow digits and spaces
    raw = raw.replace(/[^\d\s]/g, '');
    setNationalNumber(raw);

    const formatted = raw.trim() ? `${selectedCountry.dialCode} ${raw.trim()}` : '';
    onChange(formatted);
  };

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="flex items-center rounded-xl bg-slate-900/80 border border-slate-700 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all overflow-hidden">
        {/* Country Selector Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-white border-r border-slate-700 transition-colors flex-shrink-0 text-xs font-semibold select-none"
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <span className="text-slate-300 font-mono">{selectedCountry.dialCode}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* National Number Input */}
        <div className="relative flex-1 flex items-center">
          <input
            type="tel"
            required={required}
            autoFocus={autoFocus}
            value={nationalNumber}
            onChange={handleNationalNumberChange}
            placeholder={placeholder}
            className="w-full px-3.5 py-2.5 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
          />
        </div>
      </div>

      {/* Country Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-72 max-w-[90vw] bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="p-2 border-b border-slate-700/80 bg-slate-900/50">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-800 rounded-xl border border-slate-700">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un pays..."
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Country List */}
          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-700/30">
            {filteredCountries.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 text-center">Aucun pays trouvé</div>
            ) : (
              filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-indigo-600/20 text-xs transition-colors ${
                    selectedCountry.code === c.code ? 'bg-indigo-600/30 text-indigo-300 font-semibold' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">{c.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
