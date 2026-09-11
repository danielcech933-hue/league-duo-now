import { useEffect, useState } from "react";
import { Ban, Flag, ShieldAlert, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const REPORT_REASONS: [string, string][] = [
  ["toxic", "Toxic behaviour"],
  ["harassment", "Harassment"],
  ["spam", "Spam"],
  ["scam", "Scam / phishing"],
  ["fake_account", "Fake account"],
  ["inappropriate", "Inappropriate content"],
  ["other", "Something else"],
];

export function Toast({ tone, message, onClose }: { tone: "success" | "error"; message: string; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(t);
  }, [onClose]);
  return (
    <div
      role="status"
      className={`fixed bottom-24 left-1/2 z-[70] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border p-4 text-sm shadow-2xl backdrop-blur-xl lg:bottom-6 ${
        tone === "success"
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
          : "border-red-400/20 bg-red-400/10 text-red-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="flex-1">{message}</span>
        <button onClick={onClose} aria-label="Dismiss" className="text-slate-400 hover:text-white">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

function Modal({ children, onClose, labelledBy }: { children: any; onClose: () => void; labelledBy: string }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[65] grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/[.08] bg-[#0d111c]/95 p-7 shadow-[0_30px_80px_-20px_rgba(124,58,237,.35)] backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-[28px] bg-gradient-to-b from-violet-500/[.12] to-transparent" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 text-slate-400 transition hover:bg-white/[.06] hover:text-white"
        >
          <X size={16} />
        </button>
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

export function BlockModal({ userId, name, onClose, onDone }: { userId: string; name: string; onClose: () => void; onDone: (msg: string, tone: "success" | "error") => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    const { error: e } = await supabase.rpc("block_user", { _target: userId });
    setBusy(false);
    if (e) { setError(e.message); return; }
    onDone(`${name} is blocked. You won't see each other again.`, "success");
    onClose();
  };
  return (
    <Modal onClose={onClose} labelledBy="block-title">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-red-400/10 text-red-300"><Ban size={20} /></div>
      <h2 id="block-title" className="mt-5 text-2xl font-black tracking-tight">Block {name}?</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        They will be removed from your matchmaking results and your matches list, and you will not be shown to each other again.
        Your past conversation stays in your history and can be restored if you unblock them.
      </p>
      {error && <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</div>}
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button onClick={onClose} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-400 hover:text-white">Cancel</button>
        <button onClick={confirm} disabled={busy} className="rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:brightness-110 disabled:opacity-50">
          {busy ? "Blocking…" : "Block user"}
        </button>
      </div>
    </Modal>
  );
}

export function ReportModal({ userId, name, onClose, onDone }: { userId: string; name: string; onClose: () => void; onDone: (msg: string, tone: "success" | "error", blocked: boolean) => void }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (!reason) { setError("Please choose a reason."); return; }
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("report_user", { _target: userId, _reason: reason, _details: details.trim() });
    if (err) { setBusy(false); setError(err.message); return; }
    if (alsoBlock) {
      const { error: be } = await supabase.rpc("block_user", { _target: userId });
      if (be) { setBusy(false); setError(be.message); return; }
    }
    setBusy(false);
    onDone(alsoBlock ? `Report sent and ${name} is blocked.` : `Thanks — your report about ${name} was sent to moderation.`, "success", alsoBlock);
    onClose();
  };
  return (
    <Modal onClose={onClose} labelledBy="report-title">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-400/10 text-amber-300"><Flag size={20} /></div>
      <h2 id="report-title" className="mt-5 text-2xl font-black tracking-tight">Report {name}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Reports are private and reviewed by LeagueMate moderation.</p>
      <form onSubmit={submit} className="mt-6">
        <span className="label">Reason</span>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {REPORT_REASONS.map(([v, l]) => (
            <button
              type="button"
              key={v}
              onClick={() => setReason(v)}
              className={`rounded-xl border px-3 py-3 text-left text-sm font-bold transition ${
                reason === v ? "border-violet-400/40 bg-violet-400/10 text-violet-200" : "border-white/[.07] bg-black/20 text-slate-400 hover:bg-white/[.04]"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <label className="mt-5 block">
          <span className="label">Details (optional)</span>
          <textarea
            className="input resize-none"
            rows={4}
            maxLength={1000}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What happened?"
          />
        </label>
        <label className="mt-4 flex items-center gap-3 text-sm text-slate-400">
          <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-black/40 accent-violet-500" />
          Also block this user
        </label>
        {error && <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</div>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-400 hover:text-white">Cancel</button>
          <button type="submit" disabled={busy} className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 disabled:opacity-50">
            {busy ? "Sending…" : "Send report"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Inline Block + Report buttons plus their modals. */
export function SafetyControls({
  userId,
  name,
  onBlocked,
  onToast,
  compact,
}: {
  userId: string;
  name: string;
  onBlocked?: () => void;
  onToast: (msg: string, tone: "success" | "error") => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState<"block" | "report" | null>(null);
  const base = compact
    ? "inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold"
    : "inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold";
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen("report")} aria-label={`Report ${name}`} className={`${base} text-slate-400 transition hover:bg-white/[.05] hover:text-amber-200`}>
          <Flag size={compact ? 12 : 14} /> Report
        </button>
        <button type="button" onClick={() => setOpen("block")} aria-label={`Block ${name}`} className={`${base} text-slate-400 transition hover:bg-red-400/10 hover:text-red-200`}>
          <Ban size={compact ? 12 : 14} /> Block
        </button>
      </div>
      {open === "block" && (
        <BlockModal userId={userId} name={name} onClose={() => setOpen(null)} onDone={(m, t) => { onToast(m, t); if (t === "success") onBlocked?.(); }} />
      )}
      {open === "report" && (
        <ReportModal userId={userId} name={name} onClose={() => setOpen(null)} onDone={(m, t) => { onToast(m, t); if (t === "success") onBlocked?.(); }} />
      )}
    </>
  );
}

export function SafetyNote() {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/[.06] bg-white/[.02] p-4 text-xs leading-5 text-slate-500">
      <ShieldAlert size={16} className="mt-0.5 shrink-0 text-violet-300" />
      <span>LeagueMate is a safe space. Block anyone you don't want to see again, and report behaviour that breaks the rules.</span>
    </div>
  );
}
