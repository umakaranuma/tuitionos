import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  onOpen?: () => void;
  onSearch?: (query: string) => void;
  disabled?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder = "Select...", onOpen, onSearch, disabled }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      const opt = options.find(o => String(o.value) === String(value));
      setSearch(opt ? opt.label : "");
      if (onSearch) onSearch("");
      if (onOpen) onOpen();
    }
  };

  const selectedOption = options.find(o => String(o.value) === String(value));
  const filteredOptions = onSearch ? options : options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', fontFamily: 'inherit' }}>
      <div 
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: disabled ? 'var(--cr-d)' : '#fff',
          border: '1.5px solid var(--ln)', borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'text',
          color: selectedOption ? 'var(--ink)' : 'var(--ink3)',
          fontSize: '13px', transition: 'all 0.2s',
          opacity: disabled ? 0.6 : 1,
          minHeight: '40px'
        }}
        onMouseOver={e => { if (!disabled && !isOpen) e.currentTarget.style.borderColor = 'var(--tc)'; }}
        onMouseOut={e => { if (!disabled && !isOpen) e.currentTarget.style.borderColor = 'var(--ln)'; }}
      >
        {!isOpen && (
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: selectedOption ? 500 : 400 }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}
        {isOpen && (
          <input 
            autoFocus
            type="text" 
            placeholder="Search..." 
            value={search}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.target.select()}
            onChange={e => {
              setSearch(e.target.value);
              if (onSearch) onSearch(e.target.value);
            }}
            style={{ 
              border: 'none', outline: 'none', width: '100%', 
              fontSize: '13px', color: 'var(--ink)', background: 'transparent',
              fontWeight: 500, padding: 0, margin: 0, height: '100%'
            }}
          />
        )}
        <ChevronDown size={16} style={{ color: 'var(--ink3)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1.5px solid var(--ln)', borderRadius: '12px',
          boxShadow: 'var(--sh-md, 0 10px 25px rgba(0,0,0,0.1))', overflow: 'hidden',
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '6px' }}>
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <div 
                key={opt.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearch("");
                }}
                style={{
                  padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontSize: '13px', color: String(value) === String(opt.value) ? 'var(--tc-d)' : 'var(--ink2)',
                  background: String(value) === String(opt.value) ? 'var(--tc-l)' : 'transparent',
                  fontWeight: String(value) === String(opt.value) ? 600 : 400,
                  transition: 'all 0.15s'
                }}
                onMouseOver={e => { if (String(value) !== String(opt.value)) { e.currentTarget.style.background = 'var(--cr)'; e.currentTarget.style.color = 'var(--ink)'; } }}
                onMouseOut={e => { if (String(value) !== String(opt.value)) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink2)'; } }}
              >
                {opt.label}
                {String(value) === String(opt.value) && <Check size={14} style={{ color: 'var(--tc)' }} />}
              </div>
            )) : (
              <div style={{ padding: '12px', textAlign: 'center', color: 'var(--ink3)', fontSize: '13px' }}>
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
