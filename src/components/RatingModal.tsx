import { useEffect, useState } from "react";
import { Check, Star, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const VERDICTS: [string, string, string][] = [
  ["great", "Great teammate", "I'd play with them again."],
  ["okay", "It was okay", "Fine experience."],
  ["bad", "Not a good fit", "I wouldn't queue together again."],
];

const TAGS: [string, string][] = [
  ["good_communication", "Good communication"],
  ["helpful", "Helpful"],
  ["positive", "Positive"],
  ["respectful", "Respectful"],
  ["toxic", "Toxic"],
  ["no_communication", "Poor communication"],
];

export function RatingModal({
  matchId,
  ratedUser,
  name,
  onClose,
  onDone,
}: {
  matchId: string;
  ratedUser: string;
  name: string;
  onClose: () => void;
  onDone: (message: string, tone: "success" | "error") => void;
}) {
  const [verdict, setVerdict] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const toggleTag = (tag: string) => {
    setTags((current) => current.includes(tag) ? current.filter((x) => x !== tag) : [...current, tag].slice(0, 6));
  };

  const submit = async () => {
    if (!verdict || busy) return;
    setBusy(true);
    setError("");
    const { error: e } = await supabase.rpc("submit_rating", {
      _match_id: matchId,
      _rated: ratedUser,
      _verdict: verdict,
      _tags: tags,
    });
    setBusy(false);
    if (e) { setError(e.message); return; }
    onDone(`Thanks — your feedback about ${name} was saved.`, "success");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[65] grid place-items-center bg-black/65 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="rating-title" className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/[.08] bg-[#0d111c]/95 p-7 shadow-[0_30px_80px_-20px_rgba(124,58,237,.35)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 rounded-t-[28px] bg-gradient-to-b from-violet-500/[.12] to-transparent" />
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 text-slate-400 transition hover:bg-white/[.06] hover:text-white"><X size={16}/></button>
        <div className="relative">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/10 text-amber-300"><Star size={20} /></div>
          <h2 id="rating-title" className="mt-5 text-2xl font-black tracking-tight">Rate {name}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">How did this teammate feel to play with?</p>

          <div className="mt-6 grid gap-3">
            {VERDICTS.map(([value, title, subtitle]) => (
              <button type="button" key={value} onClick={() => setVerdict(value)} className={`rounded-2xl border p-4 text-left transition ${verdict === value ? "border-violet-400/40 bg-violet-400/10" : "border-white/[.07] bg-black/20 hover:bg-white/[.04]"}`}>
                <div className="flex items-center gap-3">
                  <div className={`grid h-9 w-9 place-items-center rounded-xl ${verdict === value ? "bg-violet-500 text-white" : "bg-white/[.05] text-slate-500"}`}>
                    {verdict === value ? <Check size={16}/> : <Star size={15}/>} 
                  </div>
                  <div><div className="font-bold">{title}</div><div className="mt-0.5 text-xs text-slate-500">{subtitle}</div></div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <span className="label">Optional tags</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {TAGS.map(([value, label]) => (
                <button key={value} type="button" onClick={() => toggleTag(value)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${tags.includes(value) ? "border-violet-400/40 bg-violet-400/10 text-violet-200" : "border-white/[.07] bg-black/20 text-slate-500 hover:text-white"}`}>{label}</button>
              ))}
            </div>
          </div>

          {error && <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</div>}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button onClick={onClose} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-400 hover:text-white">Not now</button>
            <button onClick={submit} disabled={!verdict || busy} className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 disabled:opacity-50">{busy ? "Saving…" : "Save feedback"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
