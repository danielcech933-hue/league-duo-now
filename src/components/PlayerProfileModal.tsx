import { useEffect, useState } from "react";
import { Award, Check, Gamepad2, Globe2, Heart, MessageCircle, Shield, Star, Swords, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ageFromDob, getCountry } from "@/lib/countries";
import { sendConnectionRequest } from "@/components/ConnectionsView";

const roleLabel: Record<string, string> = { TOP: "Top", JUNGLE: "Jungle", MID: "Mid", ADC: "ADC", SUPPORT: "Support", FILL: "Fill" };

type Profile = {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  region?: string | null;
  languages?: string[] | null;
  primary_role?: string | null;
  secondary_role?: string | null;
  voice?: string | null;
  playstyle?: string | null;
  date_of_birth?: string | null;
  country?: string | null;
};

type Reputation = { rating_count: number; great_count: number; okay_count: number; bad_count: number; great_pct: number; reputation_score: number };

type Props = { userId: string; name?: string; onClose: () => void; onToast?: (message: string, tone: "success" | "error") => void; };

export function PlayerProfileModal({ userId, name, onClose, onToast }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rep, setRep] = useState<Reputation | null>(null);
  const [connected, setConnected] = useState<"none" | "pending" | "accepted">("none");
  const [requestByMe, setRequestByMe] = useState(false);
  const [busy, setBusy] = useState(true);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setBusy(true);
      const [{ data: p, error: pe }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("id,display_name,avatar_url,bio,region,languages,primary_role,secondary_role,voice,playstyle,date_of_birth,country").eq("id", userId).maybeSingle(),
        supabase.rpc("player_reputation", { _user: userId }),
      ]);
      const { data: connections } = await supabase.rpc("my_connections");
      if (!alive) return;
      if (pe) setError(pe.message);
      setProfile((p as Profile | null) || null);
      setRep((Array.isArray(r) ? r[0] : r) as Reputation | null);
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
    const { error: e } = await sendConnectionRequest(userId);
    setConnectionBusy(false);
    if (e) { onToast?.(e.message, "error"); return; }
    setConnected("pending"); setRequestByMe(true);
    onToast?.("Teammate request sent.", "success");
  };

  const country = getCountry(profile?.country);
  const age = ageFromDob(profile?.date_of_birth);
  const score = rep?.reputation_score ?? 0;
  const repLabel = score >= 8 ? "Excellent" : score >= 4 ? "Strong" : score <= -8 ? "Needs attention" : score <= -3 ? "Low" : "Neutral";

  return <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border border-white/[.08] bg-[#0d111c] shadow-2xl">
      <div className="relative h-28 overflow-hidden bg-gradient-to-br from-violet-500/25 to-cyan-400/10">
        <button onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/20 text-slate-300 hover:text-white" aria-label="Close"><X size={16}/></button>
      </div>
      <div className="px-6 pb-7 sm:px-8">
        <div className="-mt-10 flex items-end justify-between gap-4">
          <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border-4 border-[#0d111c] bg-gradient-to-br from-violet-500 to-cyan-400 text-2xl font-black">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover"/> : (profile?.display_name || name || "?").slice(0,2).toUpperCase()}
          </div>
          <div className="flex flex-wrap gap-2">
            {connected === "accepted" ? <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-300"><Check size={14}/> Connected</span> : connected === "pending" && requestByMe ? <span className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-500">Request sent</span> : <button onClick={add} disabled={connectionBusy || connected === "pending"} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50"><UserRound size={14}/> {connectionBusy ? "Adding…" : "Add teammate"}</button>}
          </div>
        </div>

        {busy ? <div className="py-12 text-center text-sm text-slate-600">Loading profile…</div> : profile ? <>
          <div className="mt-5 flex items-center gap-2"><h2 className="text-3xl font-black">{profile.display_name || name || "Summoner"}</h2>{connected === "accepted" && <Award size={20} className="text-amber-300"/>}</div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-slate-500"><span className="inline-flex items-center gap-1.5"><Swords size={14}/> {roleLabel[profile.primary_role || "FILL"]}{profile.secondary_role && profile.secondary_role !== "FILL" ? ` · ${roleLabel[profile.secondary_role]}` : ""}</span><span>·</span><span>{profile.region || "Unknown region"}</span>{country && <><span>·</span><span>{country.flag} {country.name}</span></>}{age !== null && <><span>·</span><span>{age} years</span></>}</div>

          {profile.bio && <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400">{profile.bio}</p>}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <InfoCard icon={<Gamepad2 size={16}/>} label="Playstyle" value={profile.playstyle || "—"}/>
            <InfoCard icon={<MessageCircle size={16}/>} label="Voice" value={profile.voice === "required" ? "Voice required" : profile.voice === "none" ? "No voice" : "Voice preferred"}/>
            <InfoCard icon={<Globe2 size={16}/>} label="Languages" value={(profile.languages || []).join(", ") || "—"}/>
            <InfoCard icon={<Shield size={16}/>} label="Reputation" value={`${repLabel} · ${rep?.rating_count ?? 0} ratings`}/>
          </div>

          <div className="mt-5 rounded-2xl border border-white/[.06] bg-black/20 p-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold"><Star size={15} className="text-amber-300"/> Teammate reputation</div><span className="text-xs font-black text-slate-400">{rep?.great_pct ?? 0}% great</span></div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.max(0, Math.min(100, rep?.great_pct ?? 0))}%` }}/></div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div><div className="text-emerald-300 font-black">{rep?.great_count ?? 0}</div><div className="text-slate-600">Great</div></div><div><div className="text-slate-300 font-black">{rep?.okay_count ?? 0}</div><div className="text-slate-600">Okay</div></div><div><div className="text-red-300 font-black">{rep?.bad_count ?? 0}</div><div className="text-slate-600">Bad</div></div></div>
          </div>
        </> : <div className="py-12 text-center text-sm text-red-300">{error || "Profile not found."}</div>}
      </div>
    </div>
  </div>;
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl border border-white/[.06] bg-white/[.025] p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">{icon}{label}</div><div className="mt-2 text-sm font-bold capitalize text-slate-300">{value}</div></div>;
}
