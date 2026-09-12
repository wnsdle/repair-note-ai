"use client";

import { ChangeEvent, useState } from "react";

export function Field({ label, name, value, onChange, onKeyDown, placeholder, multiline = false, full = false }: {
  label: string; name: string; value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; multiline?: boolean; full?: boolean;
}) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      {multiline ? <textarea id={name} name={name} value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} rows={4} /> : <input id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} />}
    </div>
  );
}

export function SuggestField({ label, name, value, onChange, onKeyDown, placeholder, suggestions, mode, full = false }: {
  label: string; name: string; value: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string; suggestions: string[]; mode: "replace" | "append-line"; full?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const lastLine = value.split("\n").pop() || "";
  const queryText = (mode === "append-line" ? lastLine : value).trim().toLowerCase();
  const matches = queryText.length > 0 ? suggestions.filter((s) => s.toLowerCase().includes(queryText) && s.toLowerCase() !== queryText).slice(0, 6) : [];

  function select(s: string) {
    if (mode === "replace") {
      onChange({ target: { name, value: s, type: "text" } } as unknown as ChangeEvent<HTMLTextAreaElement>);
    } else {
      const lines = value.split("\n"); lines[lines.length - 1] = s;
      onChange({ target: { name, value: lines.join("\n") + "\n", type: "text" } } as unknown as ChangeEvent<HTMLTextAreaElement>);
    }
    setOpen(false);
  }

  return (
    <div className={`field suggest-field ${full ? "full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      <textarea id={name} name={name} value={value} onChange={onChange} onKeyDown={onKeyDown} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder={placeholder} rows={4} />
      {open && matches.length > 0 && <div className="suggest-dropdown">{matches.map((s, idx) => <button key={idx} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => select(s)}>{s}</button>)}</div>}
    </div>
  );
}
