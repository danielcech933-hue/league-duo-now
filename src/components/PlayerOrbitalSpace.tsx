import { useState } from "react";
import { MapPin, Mic2, Swords } from "lucide-react";
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
  date_of_birth?: string | null;
  country?: string | null;
  gender?: string | null;
};

type Props = { players: Player[]; onSelect?: (player: Player) => void };

const positions = [
  [8, 20], [25, 8], [48, 18], [72, 10], [84, 30],
  [76, 62], [52, 72], [27, 67], [8, 54], [42, 43],
];
const roleLabel: Record<string, string> = { TOP: "Top", JUNGLE: "Jungle", MID: "Mid", ADC: "ADC", SUPPORT: "Support", FILL: "Fill" };
const genderLabel: Record<string, string> = { male: "Male", female: "Female", non_binary: "Non-binary", other: "Other", undisclosed: "Private" };

export function PlayerOrbitalSpace({ players, onSelect }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const visible = players.slice(0, 10);

  return <section className="overflow-hidden rounded-[30px] border border-white/[.07] bg-gradient-to-br from-white/[.035] to-violet-500/[.035] p-4 sm:p-6">
    <div className="flex items-end justify-between gap-4 px-1">
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[.2em] text-emerald-300">Live players</div>
        <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Players around you</h2>
        <p className="mt-1 text-sm text-slate-500">Hover over a player bubble to reveal their full teammate card.</p>
      </div>
      <span className="shrink-0 rounded-full border border-white/[.08] bg-black/20 px-3 py-1.5 text-[10px] font-black text-slate-500">{visible.length}/10</span>
    </div>

    <div className="relative mt-4 min-h-[560px] overflow-hidden rounded-[26px] border border-white/[.06] bg-[#070a12]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,.16),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-[13%] rounded-full border border-violet-400/10" />
      <div className="pointer-events-none absolute inset-[28%] rounded-full border border-cyan-400/10" />
      <div className="absolute left-1/2 top-1/2 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-violet-400/20 bg-violet-500/[.08] text-violet-200 shadow-[0_0_70px_rgba(139,92,246,.18)]">
        <div className="text-center"><Swords className="mx-auto" size={20}/><div className="mt-1 text-[9px] font-black uppercase tracking-widest">YOU</div></div>
      </div>

      {visible.map((p, i) => {
        const age = ageFromDob(p.date_of_birth);
        const country = getCountry(p.country);
        const hoveredNow = hovered === p.user_id;
        return <button
          key={p.user_id}
          type="button"
          onMouseEnter={() => setHovered(p.user_id)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(p.user_id)}
          onBlur={() => setHovered(null)}
          onClick={() => onSelect?.(p)}
          className={`group absolute -translate-x-1/2 -translate-y-1/2 rounded-full text-left transition-[width,height,box-shadow,transform] duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-violet-300/60 ${hoveredNow ? "z-30 h-48 w-48 scale-110" : "z-10 h-28 w-28 sm:h-32 sm:w-32"}`}
          style={{ left: `${positions[i][0]}%`, top: `${positions[i][1]}%` }}
          aria-label={`Open profile ${p.display_name}`}
        >
          <span className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/70 via-indigo-500/30 to-cyan-400/50 p-[2px] shadow-[0_12px_50px_rgba(0,0,0,.35)]">
            <span className="relative block h-full w-full overflow-hidden rounded-full border border-white/10 bg-[#101523]">
              {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover"/> : <span className="grid h-full w-full place-items-center bg-gradient-to-br from-violet-500/20 to-cyan-400/10 text-2xl font-black text-white">{p.display_name.slice(0,2).toUpperCase()}</span>}
              <span className={`absolute inset-0 flex items-center justify-center bg-[#090c15]/78 p-4 backdrop-blur-[2px] transition-opacity duration-200 ${hoveredNow ? "opacity-100" : "opacity-0"}`}>
                <span className="w-full text-center">
                  <span className="block truncate text-lg font-black text-white">{p.display_name}</span>
                  <span className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold text-slate-300">{age !== null ? `${age} yrs` : "Age —"} <span>·</span> {genderLabel[p.gender || ""] || "Gender —"}</span>
                  <span className="mt-1 flex items-center justify-center gap-1 text-[10px] text-slate-400"><MapPin size={10}/> {country ? `${country.flag} ${country.name}` : p.region || "Region —"}</span>
                  <span className="mt-1 block truncate text-[10px] font-bold text-violet-200">{roleLabel[p.primary_role || "FILL"]} · {p.rank_tier || "Unranked"} {p.rank_division || ""}</span>
                  <span className="mt-1 flex items-center justify-center gap-1 text-[9px] text-slate-500"><Mic2 size={9}/> {p.voice === "none" ? "No voice" : "Voice"} · {(p.playstyle || "chill").replace("_", " ")}</span>
                </span>
              </span>
            </span>
          </span>
          {!hoveredNow && <span className="absolute inset-x-1 bottom-2 truncate text-center text-[9px] font-black text-white/90 drop-shadow">{p.display_name}</span>}
        </button>;
      })}

      {visible.length === 0 && <div className="absolute inset-0 grid place-items-center p-8 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-violet-500/10 text-violet-300"><Swords size={20}/></div><h3 className="mt-4 font-black">No live players yet</h3><p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">As players enter the live queue, up to ten of the best compatible profiles appear here.</p></div></div>}
    </div>
  </section>;
}
