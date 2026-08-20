"use client";

import { useEffect, useRef, useState } from "react";

type SelectValue = string | number;

export interface AppSelectOption<T extends SelectValue> {
  value: T;
  label: string;
  description?: string;
}

interface AppSelectProps<T extends SelectValue> {
  label: string;
  value: T;
  options: Array<AppSelectOption<T>>;
  onChange: (value: T) => void;
  compact?: boolean;
}

export function AppSelect<T extends SelectValue>({ label, value, options, onChange, compact = false }: AppSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  function closeMenu() {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        window.setTimeout(() => triggerRef.current?.focus(), 0);
      }
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    window.setTimeout(() => menuRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <>
    <button ref={triggerRef} type="button" className={`app-select-trigger${compact ? " app-select-compact" : ""}`} aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(true)}>
      <span>{selected?.label}</span>
      <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden><path d="m6 8 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open && <div className="app-select-backdrop" onMouseDown={closeMenu}>
      <section ref={menuRef} className="app-select-menu" role="dialog" aria-modal="true" aria-label={label} onMouseDown={(event) => event.stopPropagation()}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#D8D5CF]" />
        <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#6E9084]">CHOOSE ONE</p><h3 className="mt-1 text-xl font-semibold tracking-[-.025em]">{label}</h3></div><button type="button" className="app-select-close" aria-label={`Close ${label}`} onClick={closeMenu}>×</button></div>
        <div role="listbox" aria-label={label} className="space-y-2">
          {options.map((option) => {
            const active = option.value === value;
            return <button key={String(option.value)} type="button" role="option" aria-selected={active} className={`app-select-option${active ? " app-select-option-active" : ""}`} onClick={() => { onChange(option.value); closeMenu(); }}>
              <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
              <span className="app-select-radio">{active && <span />}</span>
            </button>;
          })}
        </div>
      </section>
    </div>}
  </>;
}
