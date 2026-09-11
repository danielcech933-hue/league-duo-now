import { useEffect, useState } from "react";
import { Award, CheckCircle2, Minus, ShieldAlert, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Reputation = {
  rating_count: number;
  great_count: number;
  okay_count: number;
  bad_count: number;
  great_pct: number;
  reputation_score: number;
};

export function ReputationCard({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const [data, setData] = useState<Reputation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: rows } = await supabase.rpc("player_reputation", { _user: userId });
      if (!alive) return;
      setData(((rows as Reputation[] | null) || [])[0] || null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId]);

  if (loading) return <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-4 text-xs text-slate-600">Loading reputation…</div>;

  const score = data?.reputation_score ?? 0;
  const tone = score >= 5 ? "text-emerald-300" : score <= -5 ? "text-red-300" : "text-amber-200";
  const label = score >= 8 ? "Excellent" : score >= 5 ? "Strong" : score <= -8 ? "Needs attention" : score <= -5 ? "Low" : "Neutral";

  return (
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
  );
}

function Stat({ icon, value, label }: { icon: any; value: string; label: string }) {
  return <div className="rounded-2xl border border-white/[.05] bg-black/20 p-3"><div className="flex items-center gap-2 text-slate-600">{icon}<span className="text-[11px] font-bold">{label}</span></div><div className="mt-2 text-lg font-black text-white">{value}</div></div>;
}
