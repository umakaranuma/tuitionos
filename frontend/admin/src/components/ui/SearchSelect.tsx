"use client";
import { useState, useRef, useEffect, useMemo } from "react";

export type SearchSelectOption = {
  value: string;
  label: string;
  /** Optional secondary text shown under the label in the list */
  sub?: string;
};

type Props = {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Disable the type-to-filter behavior — acts like a plain styled select. */
  searchable?: boolean;
  disabled?: boolean;
  /** Optional fixed width; otherwise fills the container. */
  width?: number | string;
  style?: React.CSSProperties;
  /** Compact trigger height for dense toolbars. */
  compact?: boolean;
  className?: string;
};

/**
 * SearchSelect — single-control combobox. The trigger itself is a text field:
 * typing into it filters the dropdown options. No separate search bar.
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchable = true,
  disabled = false,
  width,
  style,
  compact = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = useMemo(() => {
    if (!searchable) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(o =>
      o.label.toLowerCase().includes(q) || (o.sub || "").toLowerCase().includes(q)
    );
  }, [options, query, searchable]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeAndReset();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeAndReset(); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Clamp highlight when the filtered list shrinks
  useEffect(() => {
    if (highlight >= filtered.length) setHighlight(Math.max(0, filtered.length - 1));
  }, [filtered, highlight]);

  const closeAndReset = () => { setOpen(false); setQuery(""); inputRef.current?.blur(); };

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true);
    setHighlight(0);
    // Highlight the currently selected option, if any.
    if (selected) {
      const i = options.findIndex(o => o.value === selected.value);
      if (i >= 0) setHighlight(i);
    }
  };

  const pick = (opt: SearchSelectOption) => {
    onChange(opt.value);
    closeAndReset();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") { e.preventDefault(); openDropdown(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight(h => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(h => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlight]) pick(filtered[highlight]);
    } else if (e.key === "Tab") {
      closeAndReset();
    }
  };

  // What the input shows: typed query while open, otherwise the selected label.
  const displayValue = open ? query : (selected?.label ?? "");

  return (
    <div
      ref={rootRef}
      className={`ss-root ${className}`}
      style={{ width, ...style }}
    >
      <div className={`ss-trigger ${open ? "open" : ""} ${compact ? "compact" : ""} ${disabled ? "disabled" : ""}`}>
        <input
          ref={inputRef}
          type="text"
          className="ss-input"
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!searchable}
          onFocus={openDropdown}
          onClick={openDropdown}
          onChange={e => { setQuery(e.target.value); setHighlight(0); if (!open) setOpen(true); }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        <svg className="ss-caret" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </div>

      {open && (
        <div className="ss-pop" role="listbox">
          <div className="ss-list">
            {filtered.length === 0 ? (
              <div className="ss-empty">No matches</div>
            ) : (
              filtered.map((o, i) => {
                const isSel = o.value === value;
                const isHi = i === highlight;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    className={`ss-item ${isSel ? "selected" : ""} ${isHi ? "hi" : ""}`}
                    onMouseEnter={() => setHighlight(i)}
                    // Use mousedown so the option fires before the input blur closes the popup.
                    onMouseDown={e => { e.preventDefault(); pick(o); }}
                  >
                    <span className="ss-item-main">
                      <span className="ss-item-label">{o.label}</span>
                      {o.sub && <span className="ss-item-sub">{o.sub}</span>}
                    </span>
                    {isSel && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M2.5 7.5l3 3 6-6" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
