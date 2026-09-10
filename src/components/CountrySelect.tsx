import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { COUNTRIES, getCountry } from "@/lib/countries";

export function CountrySelect({ value, onChange, placeholder = "Select your country" }: { value: string; onChange: (code: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = getCountry(value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COUNTRIES;
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase() === s);
  }, [q]);

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => { setOpen((v) => !v); setQ(""); }} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-left text-sm text-white transition hover:bg-white/[.07]">
        <span className={selected ? "" : "text-slate-500"}>{selected ? `${selected.flag}  ${selected.name}` : placeholder}</span>
        <ChevronDown size={16} className="shrink-0 text-slate-500" />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0d111c]/98 shadow-[0_25px_60px_-15px_rgba(0,0,0,.8)] backdrop-blur-xl">
          <div className="flex items-center gap-2 border-b border-white/[.07] px-3">
            <Search size={14} className="text-slate-500" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country…" className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600" />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {list.length === 0 && <div className="px-4 py-4 text-sm text-slate-500">No country found.</div>}
            {list.map((c) => (
              <button key={c.code} type="button" onClick={() => { onChange(c.code); setOpen(false); }} className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-white/[.06] ${c.code === value ? "text-violet-300" : "text-slate-300"}`}>
                <span>{c.flag}  {c.name}</span>
                {c.code === value && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
