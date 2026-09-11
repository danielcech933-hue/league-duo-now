import { useEffect, useMemo, useState } from "react";
import { Clock3, MapPin, Mic2, RefreshCw, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ageFromDob, getCountry } from "@/lib/countries";

type Player = {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  primary_role?: string | null;
  secondary_role?: string | null;
  rank_tier?: string | null;
  rank_division?: string | null;
  region?: string | null;
  playstyle?: string | null;
  voice?: string | null;
  game_mode?: string | null;
  games_planned?: number | null;
  live_since?: string | null;
  score?: number | null;
  date_of_birth?: string | null;
  country?: string | null;
  gender?: string | null;
};

type Props = { players: Player[]; onSelect?: (player: Player) => void; onRefresh?: () => void; refreshing?: boolean };

const positions = [
  [8, 20], [25, 8], [48, 18], [72, 10], [84, 30],
  [76, 62], [52, 72], [27, 67], [8, 54], [42, 43],
];
const roleLabel: Record<string, string> = { TOP: "Top", JUNGLE: "Jungle", MID: "Mid", ADC: "ADC", SUPPORT: "Support", FILL: "Fill" };
const genderLabel: Record<string, string> = { male: "Male", female: "Female", non_binary: "Non-binary", other: "Other", undisclosed: "Private" };
const modeLabel: Record<string, string> = { ranked_solo: "Ranked Solo", ranked_flex: "Ranked Flex", normal: "Normal", aram: "ARAM", any: "Any mode" };

export function PlayerOrbitalSpace({ players, onSelect, onRefresh, refreshing = false }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [pool, setPool] = useState<Player[]>(players);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set(players.map((p) => p.user_id)));
  const [visibleIds, setVisibleIds] = useState<string[]>(players.slice(0, 10).map((p) => p.user_id));
  const [loadingPool, setLoadingPool] = useState(false);
  const [refreshFlash, setRefreshFlash] = useState(0);

  useEffect(() => {
    setPool((current) => {
      if (!current.length) return players;
      const known = new Set(current.map((p) => p.user_id));
      const additions = players.filter((p) => !known.has(p.user_id));
      return additions.length ? [...current, ...additions] : current;
    });
  }, [players]);

  const visible = useMemo(() => {
    const source = pool.length ? pool : players;
    if (!visibleIds.length) return source.slice(0, 10);
    const byId = new Map(source.map((p) => [p.user_id, p]));
    const picked = visibleIds.map((id) => byId.get(id)).filter(Boolean) as Player[];
    return picked.length ? picked.slice(0, 10) : source.slice(0, 10);
  }, [pool, players, visibleIds]);

  useEffect(() => {
    if (visible.length) setVisibleIds(visible.map((p) => p.user_id));
  }, [visible]);

  useEffect(() => {
    if (paused || hovered) return;
    const timer = window.setInterval(() => setRotation((value) => (value + 0.7) % 360), 80);
    return () => window.clearInterval(timer);
  }, [paused, hovered]);

  const loadLargePool = async () => {
    setLoadingPool(true);
    try {
      const { data } = await supabase.rpc("get_live_candidates", { _limit: 1000 });
      const fresh = ((data as Player[] | null) || []).filter((p) => p?.user_id);
      if (fresh.length) {
        setPool(fresh);
        return fresh;
      }
      return pool;
    } finally {
      setLoadingPool(false);
    }
  };

  const enrich = async (items: Player[]) => {
    if (!items.length) return items;
    const ids = items.map((p) => p.user_id);
    const { data } = await supabase.from("profiles").select("id,date_of_birth,country,gender").in("id", ids);
    const map = new Map((data || []).map((p: any) => [p.id, p]));
    return items.map((p) => ({
      ...p,
      date_of_birth: map.get(p.user_id)?.date_of_birth ?? p.date_of_birth ?? null,
      country: map.get(p.user_id)?.country ?? p.country ?? null,
      gender: map.get(p.user_id)?.gender ?? p.gender ?? null,
    }));
  };

  const handleRefresh = async () => {
    const freshPool = await loadLargePool();
    const available = freshPool.filter((p) => !seenIds.has(p.user_id));
    let next: Player[];

    if (available.length >= 10) {
      next = available.slice(0, 10);
    } else if (freshPool.length) {
      next = freshPool.slice(0, Math.min(10, freshPool.length));
      setSeenIds(new Set(next.map((p) => p.user_id)));
    } else {
      next = players.slice(0, 10);
    }

    next = await enrich(next);

    if (next.length) {
      setVisibleIds(next.map((p) => p.user_id));
      setPool((current) => {
        const map = new Map(current.map((p) => [p.user_id, p]));
        next.forEach((p) => map.set(p.user_id, p));
        return [...map.values()];
      });
      setSeenIds((current) => {
        const merged = new Set(current);
        next.forEach((p) => merged.add(p.user_id));
        return merged;
      });
    }
    setRefreshFlash((v) => v + 1);
    onRefresh?.();
  };

  return <section className="lm-glass relative overflow-hidden rounded-[30px] p-4 sm:p-6">
    <div className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
    <div className="pointer-events-none absolute -bottom-28 -right-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
    <div className="flex items-end justify-between gap-4 px-1">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300"/> Live players</div>
        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Players around you</h2>
        <p className="mt-1 text-sm text-slate-500">Hover a bubble to focus. The space keeps moving around your best matches.</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="rounded-full border border-white/[.08] bg-black/20 px-3 py-1.5 text-[10px] font-black text-slate-500">{visible.length}/10</span>
        {onRefresh && <button key={refreshFlash} type="button" onClick={() => void handleRefresh()} disabled={refreshing || loadingPool} className="lm-button grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.025] text-slate-500 hover:bg-white/[.06] hover:text-white disabled:opacity-40" aria-label="Refresh players" title="Refresh players"><RefreshCw size={14} className={refreshing || loadingPool ? "animate-spin" : ""}/></button>}
      </div>
    </div>

    <div className="relative mt-4 min-h-[560px] overflow-hidden rounded-[26px] border border-white/[.06] bg-[#070a12] shadow-[inset_0_1px_0_rgba(255,255,255,.04)]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => { setPaused(false); setHovered(null); }}>
      <div className="lm-grid-bg pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,.17),transparent_38%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/[.06] lm-orbit-glow" />
      {[...Array(14)].map((_, i) => <span key={i} className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-violet-200/30" style={{ ["--drift" as string]: `${i % 2 ? -18 : 18}px`, animation: `lm-particle ${5 + (i % 4)}s ease-in-out ${-(i * .65)}s infinite` }} />)}
      <div className="pointer-events-none absolute inset-[13%] rounded-full border border-violet-400/10" style={{ transform: `rotate(${rotation}deg)` }} />
      <div className="pointer-events-none absolute inset-[28%] rounded-full border border-cyan-400/10" style={{ transform: `rotate(${-rotation * 0.7}deg)` }} />
      <div className="pointer-events-none absolute inset-[17%] rounded-full border border-white/[.025] border-dashed" style={{ transform: `rotate(${-rotation * 0.35}deg)` }} />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[470px] w-[470px] -translate-x-1/2 -translate-y-1/2" style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}>
        {visible.map((p, i) => {
          const age = ageFromDob(p.date_of_birth);
          const country = getCountry(p.country);
          const hoveredNow = hovered === p.user_id;
          const angle = (positions[i][0] * 1.9 + positions[i][1]) * Math.PI / 180;
          const radius = 185 + (i % 3) * 16;
          const orbitX = Math.cos(angle) * radius;
          const orbitY = Math.sin(angle) * (radius * 0.68);
          const score = typeof p.score === "number" ? p.score : 0;
          return <button
            key={p.user_id}
            type="button"
            onMouseEnter={() => { setHovered(p.user_id); setPaused(true); }}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => { setHovered(p.user_id); setPaused(true); }}
            onBlur={() => setHovered(null)}
            onClick={() => onSelect?.(p)}
            className={`group absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full text-left transition-[width,height,box-shadow,filter] duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-violet-300/60 ${hoveredNow ? "z-30 h-48 w-48" : "z-10 h-28 w-28 sm:h-32 sm:w-32"}`}
            style={{ transform: `translate(calc(-50% + ${orbitX}px), calc(-50% + ${orbitY}px))`, transformOrigin: "center" }}
            aria-label={`Open profile ${p.display_name}`}
          >
            <span className="absolute -inset-2 rounded-full bg-violet-500/10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
            <span className={`absolute inset-0 rounded-full bg-gradient-to-br from-violet-400/80 via-indigo-500/35 to-cyan-300/65 p-[2px] transition-shadow duration-300 ${hoveredNow ? "shadow-[0_0_75px_rgba(139,92,246,.55)]" : score >= 80 ? "shadow-[0_0_38px_rgba(139,92,246,.24)]" : "shadow-[0_12px_50px_rgba(0,0,0,.35)]"}`}>
              <span className="relative block h-full w-full overflow-hidden rounded-full border border-white/10 bg-[#101523]">
                {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-110"/> : <span className="grid h-full w-full place-items-center bg-gradient-to-br from-violet-500/20 to-cyan-400/10 text-2xl font-black text-white">{p.display_name.slice(0,2).toUpperCase()}</span>}
                <span className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-violet-400/10 blur-md" />
                <span className={`absolute inset-0 flex items-center justify-center bg-[#090c15]/84 p-4 backdrop-blur-[4px] transition-opacity duration-200 ${hoveredNow ? "opacity-100" : "opacity-0"}`}>
                  <span className="w-full text-center">
                    <span className="block truncate text-lg font-black text-white">{p.display_name}</span>
                    <span className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-300">{age !== null ? `${age} yrs` : "Age —"} <span>·</span> {genderLabel[p.gender || ""] || "Gender —"}</span>
                    <span className="mt-1 flex items-center justify-center gap-1 text-[10px] text-slate-400"><MapPin size={10}/> {country ? `${country.flag} ${country.name}` : p.region || "Region —"}</span>
                    <span className="mt-1 block truncate text-[10px] font-bold text-violet-200">{roleLabel[p.primary_role || "FILL"]} · {p.rank_tier || "Unranked"} {p.rank_division || ""}</span>
                    <span className="mt-1 flex items-center justify-center gap-1 text-[9px] text-slate-400"><Mic2 size={9}/> {p.voice === "none" ? "No voice" : "Voice"} · {(p.playstyle || "chill").replace("_", " ")}</span>
                    <span className="mt-1 flex items-center justify-center gap-1 text-[9px] text-slate-500"><Clock3 size={9}/> {modeLabel[p.game_mode || ""] || p.game_mode || "Game"}{p.games_planned ? ` · ${p.games_planned} games` : ""}</span>
                    {typeof p.score === "number" && <span className="mt-2 inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-[9px] font-black text-violet-200">{score}% match</span>}
                  </span>
                </span>
              </span>
            </span>
            {!hoveredNow && <span className="absolute inset-x-1 bottom-2 truncate text-center text-[9px] font-black text-white/90 drop-shadow">{p.display_name}</span>}
            {score >= 85 && !hoveredNow && <span className="absolute right-1 top-1 rounded-full border border-violet-300/20 bg-violet-500/25 px-1.5 py-0.5 text-[7px] font-black text-violet-100 shadow-[0_0_18px_rgba(139,92,246,.25)]">BEST</span>}
          </button>;
        })}
      </div>

      <div className="absolute left-1/2 top-1/2 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-violet-400/30 bg-violet-500/[.09] shadow-[0_0_80px_rgba(139,92,246,.22)] lm-pulse">
        <div className="absolute -inset-5 rounded-full border border-violet-400/10" />
        <div className="absolute -inset-2 rounded-full border border-cyan-300/10" />
        <div className="relative text-center"><Swords className="mx-auto text-violet-200" size={22}/><div className="mt-1 text-[9px] font-black uppercase tracking-widest">YOU</div><div className="mt-1 text-[8px] text-slate-500">best matches</div></div>
      </div>

      {visible.length === 0 && <div className="absolute inset-0 grid place-items-center p-8 text-center"><div className="lm-enter-up"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-violet-500/10 text-violet-300 shadow-[0_0_40px_rgba(139,92,246,.18)]"><Swords size={20}/></div><h3 className="mt-4 font-black">No live players yet</h3><p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">As players enter the live queue, up to ten of the best compatible profiles appear here.</p>{onRefresh&&<button type="button" onClick={() => void handleRefresh()} className="lm-button mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-slate-950"><RefreshCw size={13}/> Refresh</button>}</div></div>}
    </div>
  </section>;
}
