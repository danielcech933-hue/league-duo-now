import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, Loader2, RefreshCw, Shield, Sparkles, Swords, Trophy, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/riot")({ component: RiotPage });

type RiotAccount = {
  game_name: string; tag_line: string; region: string; verified: boolean;
  rank_tier?: string | null; rank_division?: string | null; league_points?: number | null;
  profile_level?: number | null; wins?: number | null; losses?: number | null;
  top_champions?: string[] | null; synced_at?: string | null; last_error?: string | null;
};

const regions = ["EUNE", "EUW", "NA", "BR", "LAN", "LAS", "OCE", "TR", "RU", "JP", "KR", "SG", "TW", "VN"];

function RiotPage() {
  const [account, setAccount] = useState<RiotAccount | null>(null);
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [region, setRegion] = useState("EUNE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const { data } = await supabase.from("riot_accounts").select("*").maybeSingle();
    if (data) {
      setAccount(data as RiotAccount);
      setGameName(data.game_name ?? "");
      setTagLine(data.tag_line ?? "");
      setRegion(data.region ?? "EUNE");
    }
  };

  useEffect(() => { load(); }, []);

  const sync = async () => {
    setBusy(true); setError("");
    const { data, error: invokeError } = await supabase.functions.invoke("riot-sync", {
      body: { gameName, tagLine: tagLine.replace(/^#/, ""), region },
    });
    if (invokeError) setError(invokeError.message || "Could not connect to Riot.");
    else if (data?.error) setError(data.message || "Could not connect to Riot.");
    else if (data?.account) setAccount(data.account as RiotAccount);
    else setError("Riot returned an unexpected response.");
    setBusy(false);
  };

  const disconnect = async () => {
    await supabase.from("riot_accounts").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
    setAccount(null); setGameName(""); setTagLine("");
  };

  const wr = account?.wins != null && account?.losses != null && (account.wins + account.losses) > 0
    ? Math.round((account.wins / (account.wins + account.losses)) * 100) : null;

  return <div className="min-h-screen bg-[#070a12] text-white">
    <header className="mx-auto flex max-w-5xl items-center gap-4 border-b border-white/[.06] px-5 py-5">
      <a href="/" className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500"><Swords size={19}/></a>
      <div><div className="font-black">LeagueMate</div><div className="text-xs text-slate-500">Riot account</div></div>
    </header>
    <main className="mx-auto max-w-5xl px-5 py-10">
      <a href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-white"><ChevronLeft size={16}/> Back</a>
      <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-[30px] border border-white/[.07] bg-white/[.025] p-7 sm:p-9">
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-red-300"><Shield/></div><div><div className="text-xs font-bold uppercase tracking-widest text-violet-300">Verified identity</div><h1 className="text-3xl font-black">Connect Riot</h1></div></div>
          <p className="mt-5 max-w-xl text-sm leading-6 text-slate-500">Connect your Riot ID so LeagueMate can verify your rank and automatically enrich your teammate card with level, win rate and top champions.</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-[1fr_120px]">
            <label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Game name</span><input value={gameName} onChange={e=>setGameName(e.target.value)} className="input" placeholder="Faker"/></label>
            <label><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">Tag line</span><input value={tagLine} onChange={e=>setTagLine(e.target.value.replace(/^#/, ""))} className="input" placeholder="KR1"/></label>
          </div>
          <label className="mt-4 block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">League region</span><select value={region} onChange={e=>setRegion(e.target.value)} className="input">{regions.map(r=><option key={r}>{r}</option>)}</select></label>
          {error && <div className="mt-5 flex gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-300"><X size={18} className="shrink-0"/>{error}</div>}
          <button onClick={sync} disabled={busy || !gameName.trim() || !tagLine.trim()} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 font-black text-slate-950 disabled:opacity-50">{busy?<><Loader2 className="animate-spin" size={18}/> Verifying with Riot…</>:account?.verified?<><RefreshCw size={17}/> Refresh Riot data</>:<>Connect & verify <Sparkles size={17}/></>}</button>
          {account && <button onClick={disconnect} className="mt-3 w-full rounded-xl py-2 text-sm text-slate-600 hover:text-red-300">Disconnect Riot account</button>}
          <div className="mt-7 rounded-2xl border border-white/[.06] bg-black/20 p-4 text-xs leading-5 text-slate-600">Your Riot API key stays on the server. The browser never receives it. LeagueMate stores only the account identifier and public game statistics needed for matchmaking.</div>
        </section>

        <aside className="rounded-[30px] border border-white/[.07] bg-white/[.025] p-6">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600">Player data</div>
          {!account ? <div className="py-12 text-center"><Trophy className="mx-auto text-slate-700" size={42}/><div className="mt-4 font-bold">Not connected</div><p className="mt-1 text-sm text-slate-600">Verify a Riot ID to see your ranked profile.</p></div> : <>
            <div className="mt-6 flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><Check/></div><div><div className="font-black">{account.game_name}#{account.tag_line}</div><div className="text-xs text-emerald-300">Verified · {account.region}</div></div></div>
            <div className="mt-6 rounded-2xl bg-black/20 p-4"><div className="text-xs text-slate-600">Ranked Solo</div><div className="mt-1 text-2xl font-black">{account.rank_tier ? `${account.rank_tier[0]}${account.rank_tier.slice(1).toLowerCase()} ${account.rank_division ?? ""}` : "Unranked"}</div><div className="mt-1 text-xs text-slate-500">{account.league_points ?? 0} LP · Level {account.profile_level ?? "—"}</div></div>
            <div className="mt-3 grid grid-cols-2 gap-2"><Stat label="Wins" value={String(account.wins ?? 0)}/><Stat label="Losses" value={String(account.losses ?? 0)}/><Stat label="Win rate" value={wr != null ? `${wr}%` : "—"}/><Stat label="Synced" value={account.synced_at ? new Date(account.synced_at).toLocaleDateString() : "—"}/></div>
            <div className="mt-5"><div className="text-xs font-bold uppercase tracking-widest text-slate-600">Top champions</div><div className="mt-3 flex flex-wrap gap-2">{(account.top_champions ?? []).map(c=><span key={c} className="rounded-full border border-white/[.06] bg-white/[.03] px-3 py-1.5 text-xs text-slate-300">{c}</span>)}</div></div>
          </>}
        </aside>
      </div>
    </main>
  </div>;
}

function Stat({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-600">{label}</div><div className="mt-1 font-bold text-slate-300">{value}</div></div>}

export default RiotPage;
