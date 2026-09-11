import { useEffect, useState } from "react";
import { Award, Check, Gamepad2, Globe2, History, MessageCircle, Star, Swords, Trophy, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ageFromDob, getCountry } from "@/lib/countries";

const roleLabel: Record<string, string> = { TOP: "Top", JUNGLE: "Jungle", MID: "Mid", ADC: "ADC", SUPPORT: "Support", FILL: "Fill" };

type Profile = {
  id: string; display_name: string; avatar_url?: string | null; bio?: string | null; region?: string | null;
  languages?: string[] | null; primary_role?: string | null; secondary_role?: string | null; voice?: string | null;
  playstyle?: string | null; date_of_birth?: string | null; country?: string | null;
};
type Reputation = { rating_count: number; great_count: number; okay_count: number; bad_count: number; great_pct: number; reputation_score: number };
type DuoHistory = { played_together: number; wins: number; losses: number; unknown_results: number; last_played_at: string | null };
type Props = { userId: string; name?: string; onClose: () => void; onToast?: (message: string, tone: "success" | "error") => void };

export function PlayerProfileModal({ userId, name, onClose, onToast }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rep, setRep] = useState<Reputation | null>(null);
  const [history, setHistory] = useState<DuoHistory | null>(null);
  const [connected, setConnected] = useState<"none" | "pending" | "accepted">("none");
  const [requestByMe, setRequestByMe] = useState(false);
  const [busy, setBusy] = useState(true);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [gameBusy, setGameBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setBusy(true);
      const [{ data: p, error: pe }, { data: r }, { data: connections }, { data: h, error: he }] = await Promise.all([
        supabase.from("profiles").select("id,display_name,avatar_url,bio,region,languages,primary_role,secondary_role,voice,playstyle,date_of_birth,country").eq("id", userId).maybeSingle(),
        supabase.rpc("player_reputation", { _user: userId }),
        supabase.rpc("my_connections"),
        supabase.rpc("duo_history", { _other: userId }),
      ]);
      if (!alive) return;
      if (pe) setError(pe.message);
      if (he) setError(he.message);
      setProfile((p as Profile | null) || null);
      setRep((Array.isArray(r) ? r[0] : r) as Reputation | null);
      setHistory((Array.isArray(h) ? h[0] : h) as DuoHistory | null);
      const row = (connections || []).find((c: any) => c.other_user === userId);
      if (row) { setConnected(row.status === "accepted" ? "accepted" : "pending"); setRequestByMe(Boolean(row.requested_by_me)); }
      else { setConnected("none"); setRequestByMe(false); }
      setBusy(false);
    };
    void load();
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => { alive = false; window.removeEventListener("keydown", h); };
  }, [userId, onClose]);

  const add = async () => {
    setConnectionBusy(true);
    const { error: e } = await supabase.rpc("send_connection_request", { _target: userId });
    setConnectionBusy(false);
    if (e) { onToast?.(e.message, "error"); return; }
    setConnected("pending"); setRequestByMe(true);
    onToast?.("Teammate request sent.", "success");
  };

  const recordGame = async (result: "win" | "loss" | "unknown") => {
    setGameBusy(true);
    const { error: e } = await supabase.rpc("record_duo_game", { _other: userId, _result: result, _game_mode: "ranked_solo" });
    setGameBusy(false);
    if (e) { onToast?.(e.message, "error"); return; }
    const next = await supabase.rpc("duo_history", { _other: userId });
    const row = Array.isArray(next.data) ? next.data[0] : next.data;
    setHistory((row as DuoHistory | null) || null);
    const label = result === "win" ? "Win" : result === "loss" ? "Loss" : "Game";
    onToast?.(`${label} recorded for your duo history.`, "success");
  };

  const country = getCountry(profile?.country);
  const age = ageFromDob(profile?.date_of_birth);
  const score = rep?.reputation_score ?? 0;
  const repLabel = score >= 8 ? "Excellent" : score >= 4 ? "Strong" : score <= -8 ? "Needs attention" : score <= -3 ? "Low" : "Neutral";
  const lastPlayed = history?.last_played_at ? new Date(history.last_played_at).toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric" }) : null;
  const canRecord = connected === "accepted";

  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-white/[.08] bg-[#0d111c] shadow-2xl">
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-violet-500/25 to-cyan-400/10"><button onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/20 text-slate-300 hover:text-white" aria-label="Close"><X size={16}/></button></div>
      <div className="px-6 pb-7 sm:px-8">
        <div className="-mt-10 flex items-end justify-between gap-4"><div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border-4 border-[#0d111c] bg-gradient-to-br from-violet-500 to-cyan-400 text-2xl font-black">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover"/> : (profile?.display_name || name || "?").slice(0,2).toUpperCase()}</div><div className="flex flex-wrap gap-2">{connected === "accepted" ? <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-300"><Check size={14}/> Connected</span> : connected === "pending" && requestByMe ? <span className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-500">Request sent</span> : <button onClick={add} disabled={connectionBusy || connected === "pending"} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50"><UserRound size={14}/> {connectionBusy ? "Adding…" : "Add teammate"}</button>}</div></div>
        {busy ? <div className="py-12 text-center text-sm text-slate-600">Loading profile…</div> : profile ? <>
          <div className="mt-5 flex items-center gap-2"><h2 className="text-3xl font-black">{profile.display_name || name || "Summoner"}</h2>{connected === "accepted" && <Award size={20} className="text-amber-300"/>}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500"><span className="inline-flex items-center gap-1.5"><Swords size={14}/> {roleLabel[profile.primary_role || "FILL"]}{profile.secondary_role && profile.secondary_role !== "FILL" ? ` · ${roleLabel[profile.secondary_role]}` : ""}</span><span>·</span><span>{profile.region || "Unknown region"}</span>{country && <><span>·</span><span>{country.flag} {country.name}</span></>}{age !== null && <><span>·</span><span>{age} years</span></>}</div>
          {profile.bio && <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">{profile.bio}</p>}
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><InfoCard label="Playstyle" value={profile.playstyle || "—"}/><InfoCard label="Voice" value={profile.voice === "required" ? "Voice required" : profile.voice === "none" ? "No voice" : "Voice preferred"}/><InfoCard label="Languages" value={(profile.languages || []).join(", ") || "—"}/><InfoCard label="Reputation" value={`${repLabel} · ${rep?.rating_count ?? 0} ratings`}/></div>
          <div className="mt-5 rounded-2xl border border-white/[.06] bg-black/20 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold"><History size={15} className="text-violet-300"/> Shared game history</div><span className="text-xs text-slate-500">{lastPlayed ? `Last played ${lastPlayed}` : "No recorded games yet"}</span></div><div className="mt-4 grid grid-cols-3 gap-2"><Stat label="Played together" value={String(history?.played_together ?? 0)}/><Stat label="Wins" value={String(history?.wins ?? 0)}/><Stat label="Losses" value={String(history?.losses ?? 0)}/></div>{canRecord ? <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[.06] pt-4"><button disabled={gameBusy} onClick={() => void recordGame("win")} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-300 disabled:opacity-50"><Trophy size={13}/> Record win</button><button disabled={gameBusy} onClick={() => void recordGame("loss")} className="inline-flex items-center gap-1.5 rounded-lg bg-red-400/10 px-3 py-2 text-xs font-black text-red-300 disabled:opacity-50"><Swords size={13}/> Record loss</button><button disabled={gameBusy} onClick={() => void recordGame("unknown")} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-400 disabled:opacity-50"><Gamepad2 size={13}/> Record game</button></div> : <p className="mt-4 text-[11px] leading-5 text-slate-600">Game history can be recorded after you are connected with this teammate.</p>}</div>
          <div className="mt-5 rounded-2xl border border-white/[.06] bg-black/20 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold"><Star size={15} className="text-amber-300"/> Teammate reputation</div><span className="text-xs font-black text-slate-400">{rep?.great_pct ?? 0}% great</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.max(0, Math.min(100, rep?.great_pct ?? 0))}%` }}/></div><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div><div className="font-black text-emerald-300">{rep?.great_count ?? 0}</div><div className="text-slate-600">Great</div></div><div><div className="font-black text-slate-300">{rep?.okay_count ?? 0}</div><div className="text-slate-600">Okay</div></div><div><div className="font-black text-red-300">{rep?.bad_count ?? 0}</div><div className="text-slate-600">Bad</div></div></div></div>
        </> : <div className="py-12 text-center text-sm text-red-300">{error || "Profile not found."}</div>}
      </div>
    </div>
  </div>;
}

function InfoCard({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-white/[.06] bg-white/[.025] p-4"><div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{label}</div><div className="mt-2 text-sm font-bold capitalize text-slate-300">{value}</div></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-white/[.025] p-3 text-center"><div className="text-lg font-black text-white">{value}</div><div className="mt-1 text-[10px] uppercase tracking-widest text-slate-600">{label}</div></div>; }
