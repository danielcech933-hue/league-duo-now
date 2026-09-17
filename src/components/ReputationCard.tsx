import { useEffect, useState } from "react";
import { Award, CheckCircle2, ExternalLink, Gamepad2, Minus, ShieldAlert, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Reputation = {
  rating_count: number;
  great_count: number;
  okay_count: number;
  bad_count: number;
  great_pct: number;
  reputation_score: number;
};

type RiotAccount = {
  game_name: string;
  tag_line: string;
  region: string;
  verified: boolean;
  rank_tier?: string | null;
  rank_division?: string | null;
  synced_at?: string | null;
};

export function ReputationCard({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const [data, setData] = useState<Reputation | null>(null);
  const [riot, setRiot] = useState<RiotAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: rows }, { data: riotRow }] = await Promise.all([
        supabase.rpc("player_reputation", { _user: userId }),
        supabase
          .from("riot_accounts")
          .select("game_name,tag_line,region,verified,rank_tier,rank_division,synced_at")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      if (!alive) return;
      setData(((rows as Reputation[] | null) || [])[0] || null);
      setRiot((riotRow as RiotAccount | null) || null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId]);

  if (loading) return <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-4 text-xs text-slate-600">Loading profile data…</div>;

  const score = data?.reputation_score ?? 0;
  const tone = score >= 5 ? "text-emerald-300" : score <= -5 ? "text-red-300" : "text-amber-200";
  const label = score >= 8 ? "Excellent" : score >= 5 ? "Strong" : score <= -8 ? "Needs attention" : score <= -5 ? "Low" : "Neutral";
  const rank = riot?.rank_tier ? `${riot.rank_tier[0]}${riot.rank_tier.slice(1).toLowerCase()} ${riot.rank_division ?? ""}`.trim() : "Unranked";

  return (
    <div className="space-y-5">
      <section className={`rounded-3xl border border-white/[.07] bg-white/[.025] ${compact ? "p-4" : "p-6"}`}>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/10 text-amber-300"><Award size={19} /></div>
          <div className="min-w-0 flex-1">
            <div className="font-bold">Teammate reputation</div>
            <div className="text-xs text-slate-600">Based on feedback from your matches.</div>
          </div>
          <div className={`text-sm font-black ${tone}`}>{label}</div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Stat icon={<Star size={14} />} value={String(data?.rating_count ?? 0)} label="Ratings" />
          <Stat icon={<CheckCircle2 size={14} />} value={String(data?.great_count ?? 0)} label="Great" />
          <Stat icon={<Minus size={14} />} value={String(data?.okay_count ?? 0)} label="Okay" />
          <Stat icon={<ShieldAlert size={14} />} value={String(data?.bad_count ?? 0)} label="Bad" />
        </div>

        <div className="mt-5 flex items-center justify-between text-xs">
          <span className="text-slate-600">Great teammate rate</span>
          <span className="font-black text-white">{data?.great_pct ?? 0}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[.05]">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400" style={{ width: `${Math.min(100, Math.max(0, data?.great_pct ?? 0))}%` }} />
        </div>
        <div className="mt-4 rounded-xl bg-violet-500/[.05] px-3 py-2 text-xs leading-5 text-slate-500">
          Reputation can slightly improve or reduce your matchmaking position. New players start neutral.
        </div>
      </section>

      <section className={`rounded-3xl border ${riot?.verified ? "border-emerald-400/15" : "border-violet-400/15"} bg-white/[.025] ${compact ? "p-4" : "p-6"}`}>
        <div className="flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${riot?.verified ? "bg-emerald-400/10 text-emerald-300" : "bg-violet-400/10 text-violet-300"}`}>
            <Gamepad2 size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold">Riot account</div>
            <div className="text-xs text-slate-600">Use verified Riot data for rank and teammate matching.</div>
          </div>
          {riot?.verified && <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300">Verified</span>}
        </div>

        {riot?.verified ? (
          <div className="mt-5 rounded-2xl border border-white/[.06] bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black text-white">{riot.game_name}<span className="text-slate-500">#{riot.tag_line}</span></div>
                <div className="mt-1 text-xs text-slate-500">{riot.region} · {rank}</div>
              </div>
              <a href="/riot" className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/[.05] hover:text-white">
                Manage <ExternalLink size={13} />
              </a>
            </div>
            {riot.synced_at && <div className="mt-3 text-[11px] text-slate-600">Last synced {new Date(riot.synced_at).toLocaleString("cs-CZ")}</div>}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-white/[.06] bg-black/20 p-4">
            <div className="text-sm font-bold text-white">Riot ID is not verified yet</div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Connect your Riot ID to verify your account and pull real ranked data. Your Riot API key remains server-side.</p>
            <a href="/riot" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-950">
              Connect & verify Riot ID <ExternalLink size={13} />
            </a>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: any; value: string; label: string }) {
  return <div className="rounded-2xl border border-white/[.05] bg-black/20 p-3"><div className="flex items-center gap-2 text-slate-600">{icon}<span className="text-[11px] font-bold">{label}</span></div><div className="mt-2 text-lg font-black text-white">{value}</div></div>;
}
