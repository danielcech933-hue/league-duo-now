import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, Check, ChevronDown, Gamepad2, Heart, Home, LogIn, LogOut,
  MessageCircle, MoreHorizontal, Search, Settings, Shield, Sparkles, Swords,
  ThumbsDown, Trophy, User, Users, Wifi, X, Zap
} from "lucide-react";

export const Route = createFileRoute("/")({ component: LeagueMateApp });

type Candidate = {
  user_id: string; display_name: string; avatar_url?: string | null; bio?: string | null;
  region: string; languages: string[]; primary_role: string; secondary_role: string;
  voice: string; playstyle: string; game_mode: string; rank_tier?: string | null;
  rank_division?: string | null; riot_id?: string | null; wins?: number | null;
  losses?: number | null; note?: string | null; games_planned: number; status: string;
  live_since: string; score: number; reasons: string[];
};

type Profile = { id: string; display_name: string; avatar_url?: string | null; bio?: string | null; region: string; languages: string[]; primary_role: string; secondary_role: string; voice: string; playstyle: string; onboarded: boolean };

type View = "home" | "live" | "matches" | "messages" | "profile" | "settings";

const roleLabel: Record<string,string> = { TOP:"Top", JUNGLE:"Jungle", MID:"Mid", ADC:"ADC", SUPPORT:"Support", FILL:"Fill" };
const tierLabel = (tier?: string|null, div?: string|null) => tier ? `${tier[0]}${tier.slice(1).toLowerCase()}${div ? ` ${div}` : ""}` : "Unranked";

const demoPlayers: Candidate[] = [
  {user_id:"demo-1",display_name:"Nox#EUW",region:"EUW",languages:["EN"],primary_role:"JUNGLE",secondary_role:"TOP",voice:"preferred",playstyle:"competitive",game_mode:"ranked_solo",rank_tier:"EMERALD",rank_division:"II",riot_id:"Nox#EUW",wins:81,losses:70,games_planned:3,status:"looking",live_since:new Date().toISOString(),score:96,reasons:["Similar rank","Complementary roles","Same game mode","Both use voice"]},
  {user_id:"demo-2",display_name:"Marek#CZ1",region:"EUNE",languages:["CZ","EN"],primary_role:"SUPPORT",secondary_role:"ADC",voice:"preferred",playstyle:"chill",game_mode:"ranked_solo",rank_tier:"DIAMOND",rank_division:"IV",riot_id:"Marek#CZ1",wins:116,losses:104,games_planned:2,status:"looking",live_since:new Date().toISOString(),score:91,reasons:["Same region","Similar rank","Shared language","Same game mode"]},
  {user_id:"demo-3",display_name:"Lumi#SK",region:"EUNE",languages:["SK","EN"],primary_role:"MID",secondary_role:"SUPPORT",voice:"required",playstyle:"serious",game_mode:"ranked_solo",rank_tier:"EMERALD",rank_division:"I",riot_id:"Lumi#SK",wins:94,losses:82,games_planned:2,status:"looking",live_since:new Date().toISOString(),score:88,reasons:["Same region","Similar rank","Same game mode","Both use voice"]},
];

function LeagueMateApp() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [view, setView] = useState<View>("home");
  const [authMode, setAuthMode] = useState<"signin"|"signup">("signin");
  const [showAuth, setShowAuth] = useState(false);
  const [looking, setLooking] = useState(false);
  const [count, setCount] = useState(0);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [match, setMatch] = useState<{name:string; conversationId?:string}|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({data}) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });
    const {data: listener} = supabase.auth.onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next) await loadProfile(next.user.id); else setProfile(null);
    });
    return () => { mounted=false; listener.subscription.unsubscribe(); };
  }, []);

  const loadProfile = async (id: string) => {
    const {data} = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (data) setProfile(data as Profile);
  };

  const refreshLive = async () => {
    if (!session) return;
    const [{data: players}, {data: liveCount}] = await Promise.all([
      supabase.rpc("get_live_candidates", {_limit:20}),
      supabase.rpc("live_player_count")
    ]);
    setCandidates(((players as Candidate[]|null) ?? []));
    setCount(typeof liveCount === "number" ? liveCount : 0);
    setCardIndex(0);
  };

  useEffect(() => { if (session) refreshLive(); }, [session]);

  useEffect(() => {
    if (!looking || !session) return;
    const heartbeat = window.setInterval(() => { supabase.rpc("live_heartbeat", {_status:"looking"}); }, 30000);
    const refresh = window.setInterval(refreshLive, 15000);
    return () => { window.clearInterval(heartbeat); window.clearInterval(refresh); };
  }, [looking, session]);

  const startLooking = async () => {
    if (!session) { setShowAuth(true); return; }
    const p = profile;
    await supabase.rpc("start_live_session", {
      _game_mode:"ranked_solo", _primary_role:p?.primary_role ?? "FILL", _secondary_role:p?.secondary_role ?? "FILL",
      _languages:p?.languages ?? ["EN"], _voice:p?.voice ?? "preferred", _playstyle:p?.playstyle ?? "chill",
      _region:p?.region ?? "EUNE", _rank_range:"pm1", _games_planned:2, _note:null
    });
    setLooking(true); setView("live"); await refreshLive();
  };

  const stopLooking = async () => { if (session) await supabase.rpc("stop_live_session"); setLooking(false); await refreshLive(); };

  const swipe = async (action: "like"|"pass"|"super_like") => {
    const target = candidates[cardIndex]; if (!target || !session) return;
    const {data, error} = await supabase.rpc("swipe", {_target:target.user_id, _action:action, _score:target.score});
    if (!error && (data as any)?.matched) setMatch({name:target.display_name, conversationId:(data as any).conversation_id});
    setCardIndex(v => v + 1);
    setTimeout(refreshLive, 250);
  };

  if (loading) return <Splash />;
  if (!session) return <Landing onAuth={(mode) => {setAuthMode(mode);setShowAuth(true)}} />;

  return <div className="min-h-screen bg-[#070a12] text-white selection:bg-violet-500/30">
    <AppShell profile={profile} view={view} setView={setView} looking={looking} count={count} onPlay={startLooking} onStop={stopLooking} onLogout={() => supabase.auth.signOut()}>
      {view === "home" && <Dashboard profile={profile} count={count} looking={looking} onPlay={startLooking} onExplore={() => {setView("live"); refreshLive()}} />}
      {view === "live" && <LiveView candidates={candidates} cardIndex={cardIndex} count={count} looking={looking} onPlay={startLooking} onStop={stopLooking} onSwipe={swipe} onRefresh={refreshLive} />}
      {view === "matches" && <MatchesView />}
      {view === "messages" && <MessagesView />}
      {view === "profile" && <ProfileView profile={profile} session={session} onSaved={() => loadProfile(session.user.id)} />}
      {view === "settings" && <SettingsView />}
    </AppShell>
    {match && <MatchModal match={match} onClose={() => {setMatch(null);setView("messages")}} />}
    {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onClose={() => setShowAuth(false)} />}
  </div>;
}

function Splash(){ return <div className="min-h-screen grid place-items-center bg-[#070a12]"><div className="text-center"><div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-violet-500 shadow-[0_0_45px_rgba(139,92,246,.45)]"><Swords/></div><div className="text-2xl font-black tracking-tight">LeagueMate</div><div className="mt-2 text-sm text-slate-500">Finding your next teammate…</div></div></div> }

function Landing({onAuth}:{onAuth:(m:"signin"|"signup")=>void}){
 return <div className="min-h-screen overflow-hidden bg-[#070a12] text-white">
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,.2),transparent_42%)]"/>
  <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10"><Brand/><button onClick={()=>onAuth("signin")} className="rounded-xl border border-white/10 bg-white/[.04] px-5 py-2.5 text-sm font-semibold hover:bg-white/[.08]">Sign in</button></header>
  <main className="relative mx-auto max-w-7xl px-6 pb-20 pt-16 text-center lg:px-10 lg:pt-28">
   <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"/> LIVE MATCHMAKING</div>
   <h1 className="mx-auto max-w-4xl text-5xl font-black tracking-[-.04em] sm:text-7xl">Your next duo is<br/><span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">online right now.</span></h1>
   <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">Stop searching Discord servers. Tell LeagueMate what you want to play and meet compatible League players who are looking right now.</p>
   <button onClick={()=>onAuth("signup")} className="group mt-9 inline-flex items-center gap-3 rounded-2xl bg-white px-7 py-4 font-black text-slate-950 shadow-[0_15px_60px_rgba(139,92,246,.25)] transition hover:-translate-y-0.5">Find players now <ArrowRight className="transition group-hover:translate-x-1" size={19}/></button>
   <div className="mx-auto mt-20 grid max-w-4xl gap-4 text-left sm:grid-cols-3"><Feature icon={<Zap/>} title="Go LIVE" text="One tap tells the queue you're ready to play."/><Feature icon={<Heart/>} title="Find your fit" text="Ranks, roles, language and playstyle shape every match."/><Feature icon={<MessageCircle/>} title="Match & play" text="Mutual likes open a private chat instantly."/></div>
  </main>
 </div>
}
function Feature({icon,title,text}:{icon:any;title:string;text:string}){return <div className="rounded-2xl border border-white/[.07] bg-white/[.025] p-5"><div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300">{icon}</div><div className="font-bold">{title}</div><div className="mt-1 text-sm leading-6 text-slate-500">{text}</div></div>}
function Brand(){return <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500 shadow-[0_0_25px_rgba(139,92,246,.35)]"><Swords size={19}/></div><span className="text-lg font-black tracking-tight">LeagueMate</span></div>}

function AppShell({children,profile,view,setView,looking,count,onPlay,onStop,onLogout}:{children:any;profile:Profile|null;view:View;setView:(v:View)=>void;looking:boolean;count:number;onPlay:()=>void;onStop:()=>void;onLogout:()=>void}){
 const nav:[View,string,any][] = [["home","Home",Home],["live","Live",Zap],["matches","Matches",Heart],["messages","Messages",MessageCircle],["profile","Profile",User]];
 return <div className="mx-auto flex min-h-screen max-w-[1600px]">
  <aside className="hidden w-64 shrink-0 border-r border-white/[.06] bg-[#090c15] p-5 lg:flex lg:flex-col"><Brand/><div className="mt-9 space-y-1">{nav.map(([id,label,Icon])=><NavButton key={id} active={view===id} icon={<Icon size={19}/>} label={label} onClick={()=>setView(id)}/>)}</div><div className="mt-auto"><button onClick={()=>setView("settings")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-500 hover:bg-white/[.04] hover:text-white"><Settings size={18}/> Settings</button><div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/[.06] bg-white/[.025] p-3"><Avatar name={profile?.display_name ?? "Player"} src={profile?.avatar_url}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{profile?.display_name ?? "Player"}</div><div className="text-xs text-slate-500">{profile?.region ?? "EU"}</div></div><button onClick={onLogout} title="Sign out" className="text-slate-500 hover:text-white"><LogOut size={16}/></button></div></div></aside>
  <div className="min-w-0 flex-1"><header className="sticky top-0 z-30 border-b border-white/[.06] bg-[#070a12]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8"><div className="flex items-center justify-between"><div className="lg:hidden"><Brand/></div><div className="hidden items-center gap-3 lg:flex"><div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.7)]"/><span className="text-sm text-slate-400"><b className="text-white">{count}</b> players looking right now</span></div><div className="flex items-center gap-2"><button onClick={looking?onStop:onPlay} className={`hidden items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold sm:flex ${looking?"border border-emerald-400/20 bg-emerald-400/10 text-emerald-300":"bg-white text-slate-950"}`}>{looking?<><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"/> Looking now</>:<><Zap size={16}/> Play now</>}</button><div className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.04] text-slate-300"><User size={17}/></div></div></div></header><main className="px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
  <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[.07] bg-[#090c15]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"><div className="mx-auto flex max-w-lg justify-around">{nav.map(([id,label,Icon])=><button key={id} onClick={()=>setView(id)} className={`flex min-w-14 flex-col items-center gap-1 px-3 py-2.5 text-[10px] font-semibold ${view===id?"text-violet-300":"text-slate-500"}`}><Icon size={19}/>{label}</button>)}</div></nav>
 </div>
 </div>
}
function NavButton({active,icon,label,onClick}:{active:boolean;icon:any;label:string;onClick:()=>void}){return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active?"bg-violet-500/10 text-violet-300":"text-slate-500 hover:bg-white/[.04] hover:text-white"}`}>{icon}{label}</button>}
function Avatar({name,src,size="md"}:{name:string;src?:string|null;size?:"sm"|"md"|"lg"}){const initials=name.split(/[# ]/)[0].slice(0,2).toUpperCase(); const s=size==="lg"?"h-24 w-24 text-2xl":size==="sm"?"h-8 w-8 text-[10px]":"h-11 w-11 text-sm"; return src?<img src={src} alt="" className={`${s} rounded-full object-cover ring-1 ring-white/10`}/>:<div className={`${s} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500/80 to-cyan-400/70 font-black text-white ring-1 ring-white/10`}>{initials}</div>}

function Dashboard({profile,count,looking,onPlay,onExplore}:{profile:Profile|null;count:number;looking:boolean;onPlay:()=>void;onExplore:()=>void}){
 return <div className="mx-auto max-w-7xl"><div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="mb-2 text-sm font-semibold text-violet-300">GOOD TO SEE YOU</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Who are you playing with?</h1><p className="mt-2 text-slate-500">{looking?"You're live. The queue is searching for your next teammate.":"Find someone who is ready to play League right now."}</p></div>{looking&&<div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"/> LIVE</div>}</div>
  <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><section className="relative overflow-hidden rounded-[28px] border border-white/[.07] bg-gradient-to-br from-violet-500/[.13] via-white/[.025] to-cyan-400/[.05] p-7 sm:p-10"><div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl"/><div className="relative"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-400"/> Live queue</div><div className="mt-5 max-w-xl text-4xl font-black tracking-[-.03em] sm:text-5xl">Your duo is <span className="text-violet-300">already online.</span></div><p className="mt-4 max-w-lg leading-7 text-slate-400">{count>0?`${count} players are looking right now. Your preferences will shape the best candidates.`:"Be the first player in the queue and invite your friends."}</p><button onClick={onPlay} className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-white px-6 py-3.5 font-black text-slate-950 shadow-xl hover:-translate-y-0.5">{looking?"Open live queue":"PLAY NOW"}<ArrowRight size={18}/></button></div></section>
   <section className="rounded-[28px] border border-white/[.07] bg-white/[.025] p-6"><div className="flex items-center justify-between"><div><div className="text-xs font-bold uppercase tracking-widest text-slate-500">Your player card</div><div className="mt-1 font-bold">Ready for matchmaking</div></div><button onClick={onExplore} className="text-slate-500 hover:text-white"><MoreHorizontal/></button></div><div className="mt-6 flex items-center gap-4"><Avatar name={profile?.display_name??"Player"} src={profile?.avatar_url} size="lg"/><div><div className="text-xl font-black">{profile?.display_name??"Summoner"}</div><div className="mt-1 text-sm text-slate-500">{roleLabel[profile?.primary_role??"FILL"]} · {profile?.region??"EUNE"}</div></div></div><div className="mt-6 grid grid-cols-2 gap-2">{[["Role",roleLabel[profile?.primary_role??"FILL"]],["Style",profile?.playstyle??"Chill"],["Voice",profile?.voice??"Preferred"],["Language",profile?.languages?.join(", ")??"EN"]].map(([a,b])=><div key={a} className="rounded-xl bg-black/20 p-3"><div className="text-[10px] uppercase tracking-wider text-slate-600">{a}</div><div className="mt-1 text-sm font-semibold capitalize text-slate-300">{b}</div></div>)}</div></section>
  </div><div className="mt-8 flex items-center justify-between"><div><h2 className="text-lg font-bold">Live now</h2><p className="text-sm text-slate-500">People ready to queue.</p></div><button onClick={onExplore} className="text-sm font-bold text-violet-300 hover:text-violet-200">View all <ArrowRight className="ml-1 inline" size={15}/></button></div>
 </div>
}

function LiveView({candidates,cardIndex,count,looking,onPlay,onStop,onSwipe,onRefresh}:{candidates:Candidate[];cardIndex:number;count:number;looking:boolean;onPlay:()=>void;onStop:()=>void;onSwipe:(a:"like"|"pass"|"super_like")=>void;onRefresh:()=>void}){
 const current=candidates[cardIndex];
 return <div className="mx-auto max-w-6xl"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400"/> {count} looking now</div><h1 className="mt-2 text-3xl font-black">Find your next teammate</h1><p className="mt-1 text-sm text-slate-500">Best matches are ranked by compatibility, not randomness.</p></div><div className="flex gap-2"><button onClick={onRefresh} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-400 hover:bg-white/[.04]">Refresh</button>{looking&&<button onClick={onStop} className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm font-semibold text-emerald-300">Stop looking</button>}</div></div>
 {!looking?<div className="mx-auto max-w-xl rounded-[30px] border border-white/[.07] bg-white/[.025] p-10 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-violet-500/10 text-violet-300"><Zap/></div><h2 className="mt-5 text-2xl font-black">Start looking now</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Join the realtime queue. We'll show compatible players who are ready at this exact moment.</p><button onClick={onPlay} className="mt-6 rounded-2xl bg-white px-6 py-3 font-black text-slate-950">GO LIVE</button></div>:!current?<EmptyQueue onRefresh={onRefresh}/>:<div className="grid gap-8 lg:grid-cols-[minmax(0,620px)_320px] lg:justify-center"><div className="relative mx-auto w-full max-w-[620px]"><PlayerCard player={current}/><div className="mt-5 flex items-center justify-center gap-3"><button onClick={()=>onSwipe("pass")} className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-white/[.04] text-slate-400 transition hover:scale-105 hover:border-red-400/30 hover:text-red-300"><X/></button><button onClick={()=>onSwipe("super_like")} className="grid h-11 w-11 place-items-center rounded-full border border-violet-400/20 bg-violet-400/10 text-violet-300 transition hover:scale-105"><Sparkles size={18}/></button><button onClick={()=>onSwipe("like")} className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-white shadow-[0_10px_35px_rgba(168,85,247,.3)] transition hover:scale-105"><Heart fill="currentColor"/></button></div><div className="mt-3 text-center text-xs text-slate-600">{cardIndex+1} of {candidates.length} candidates · swipe or use the buttons</div></div><aside className="hidden rounded-3xl border border-white/[.07] bg-white/[.025] p-5 lg:block"><div className="text-xs font-bold uppercase tracking-widest text-slate-600">Your search</div><div className="mt-4 space-y-2"><FilterRow label="Mode" value="Ranked Solo"/><FilterRow label="Role" value="Any compatible"/><FilterRow label="Rank" value="±1 tier"/><FilterRow label="Voice" value="Preferred"/></div><div className="mt-6 rounded-2xl bg-violet-500/[.07] p-4"><div className="flex items-center gap-2 text-sm font-bold text-violet-200"><Wifi size={15}/> Realtime</div><p className="mt-1 text-xs leading-5 text-slate-500">Candidates disappear automatically when they stop looking.</p></div></aside></div>}
 </div>
}
function FilterRow({label,value}:{label:string;value:string}){return <div className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2.5"><span className="text-xs text-slate-600">{label}</span><span className="text-xs font-semibold text-slate-300">{value}</span></div>}
function EmptyQueue({onRefresh}:{onRefresh:()=>void}){return <div className="mx-auto max-w-xl rounded-[30px] border border-white/[.07] bg-white/[.025] p-10 text-center"><Users className="mx-auto text-slate-600" size={42}/><h2 className="mt-5 text-2xl font-black">It's quiet right now.</h2><p className="mt-2 text-sm leading-6 text-slate-500">No compatible LIVE players are available in your current search. Broaden your preferences or check again in a moment.</p><button onClick={onRefresh} className="mt-5 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/[.04]">Check again</button></div>}
function PlayerCard({player:p}:{player:Candidate}){const wr=p.wins&&p.losses?Math.round((p.wins/(p.wins+p.losses))*100):null; return <div className="relative overflow-hidden rounded-[32px] border border-white/[.08] bg-[#0d111c] shadow-2xl"><div className="h-28 bg-gradient-to-br from-violet-500/25 via-fuchsia-500/10 to-cyan-400/10"/><div className="px-6 pb-7"><div className="-mt-11 flex items-end justify-between"><Avatar name={p.display_name} src={p.avatar_url} size="lg"/><div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300"><span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"/> LOOKING NOW</div></div><div className="mt-4"><div className="text-2xl font-black">{p.display_name}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500"><span>{tierLabel(p.rank_tier,p.rank_division)}</span><span>·</span><span>{p.region}</span>{wr&&<><span>·</span><span>{wr}% WR</span></>}</div></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"><Badge label="Role" value={roleLabel[p.primary_role]}/><Badge label="Mode" value={p.game_mode==="ranked_solo"?"Ranked":"Normal"}/><Badge label="Voice" value={p.voice}/><Badge label="Games" value={`${p.games_planned} games`}/></div><div className="mt-5 rounded-2xl border border-violet-400/10 bg-violet-400/[.05] p-4"><div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-violet-300">Compatibility</span><span className="text-2xl font-black text-white">{p.score}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{width:`${p.score}%`}}/></div></div><div className="mt-5"><div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">Why you match</div><div className="flex flex-wrap gap-2">{p.reasons.slice(0,5).map(r=><span key={r} className="inline-flex items-center gap-1.5 rounded-full border border-white/[.06] bg-white/[.03] px-2.5 py-1.5 text-xs text-slate-400"><Check size={12} className="text-emerald-400"/>{r}</span>)}</div></div>{p.note&&<p className="mt-5 border-l-2 border-violet-400/30 pl-3 text-sm italic text-slate-500">“{p.note}”</p>}</div></div>}
function Badge({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-black/20 p-2.5"><div className="text-[9px] uppercase tracking-wider text-slate-600">{label}</div><div className="mt-1 truncate text-xs font-semibold capitalize text-slate-300">{value}</div></div>}

function MatchesView(){return <Page title="Matches" subtitle="Players who mutually chose to play with you."><div className="rounded-3xl border border-white/[.07] bg-white/[.025] p-10 text-center"><Heart className="mx-auto text-violet-300"/><h2 className="mt-4 text-xl font-black">Your matches live here</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Start looking and like compatible players. When they like you back, your match appears here and a private chat opens automatically.</p></div></Page>}
function MessagesView(){return <Page title="Messages" subtitle="Your private teammate conversations."><div className="rounded-3xl border border-white/[.07] bg-white/[.025] p-10 text-center"><MessageCircle className="mx-auto text-violet-300"/><h2 className="mt-4 text-xl font-black">No conversations yet</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Mutual likes automatically create a private conversation. Your messages will appear here.</p></div></Page>}
function Page({title,subtitle,children}:{title:string;subtitle:string;children:any}){return <div className="mx-auto max-w-6xl"><h1 className="text-3xl font-black tracking-tight">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p><div className="mt-7">{children}</div></div>}

function ProfileView({profile,session,onSaved}:{profile:Profile|null;session:any;onSaved:()=>void}){const [name,setName]=useState(profile?.display_name??"");const [bio,setBio]=useState(profile?.bio??"");const [role,setRole]=useState(profile?.primary_role??"FILL"); const [saving,setSaving]=useState(false); useEffect(()=>{setName(profile?.display_name??"");setBio(profile?.bio??"");setRole(profile?.primary_role??"FILL")},[profile]); const save=async()=>{setSaving(true);await supabase.from("profiles").update({display_name:name,bio,primary_role:role}).eq("id",session.user.id);setSaving(false);onSaved()}; return <Page title="Profile" subtitle="Your public teammate identity."><div className="grid gap-5 lg:grid-cols-[280px_1fr]"><section className="rounded-3xl border border-white/[.07] bg-white/[.025] p-6 text-center"><Avatar name={name||"Player"} src={profile?.avatar_url} size="lg"/><div className="mt-4 text-xl font-black">{name||"Summoner"}</div><div className="mt-1 text-sm text-slate-500">{profile?.region}</div><div className="mt-5 rounded-2xl bg-black/20 p-4 text-left"><div className="text-[10px] uppercase tracking-wider text-slate-600">Riot account</div><div className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-300"><Shield size={14} className="text-emerald-400"/> Connection ready</div></div></section><section className="rounded-3xl border border-white/[.07] bg-white/[.025] p-6 sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><Field label="Display name"><input value={name} onChange={e=>setName(e.target.value)} className="input"/></Field><Field label="Main role"><select value={role} onChange={e=>setRole(e.target.value)} className="input">{Object.entries(roleLabel).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></Field></div><Field label="Bio"><textarea value={bio} onChange={e=>setBio(e.target.value)} rows={5} maxLength={240} placeholder="Tell teammates what you're looking for…" className="input resize-none"/></Field><div className="flex justify-end"><button onClick={save} disabled={saving} className="rounded-xl bg-white px-5 py-2.5 text-sm font-black text-slate-950 disabled:opacity-50">{saving?"Saving…":"Save changes"}</button></div></section></div></Page>}
function Field({label,children}:{label:string;children:any}){return <label className="mb-5 block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>{children}</label>}
function SettingsView(){return <Page title="Settings" subtitle="Control how LeagueMate works for you."><div className="max-w-2xl space-y-3"><Setting icon={<Shield/>} title="Privacy & safety" text="Manage blocking, reporting and who can interact with you."/><Setting icon={<Trophy/>} title="Matchmaking preferences" text="Rank range, languages, roles, voice and playstyle."/><Setting icon={<Gamepad2/>} title="Riot account" text="Connect your Riot ID to verify rank and enrich your player card."/></div></Page>}
function Setting({icon,title,text}:{icon:any;title:string;text:string}){return <button className="flex w-full items-center gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-5 text-left hover:bg-white/[.04]"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300">{icon}</div><div className="flex-1"><div className="font-bold">{title}</div><div className="mt-1 text-sm text-slate-500">{text}</div></div><ChevronDown className="rotate-[-90deg] text-slate-600" size={18}/></button>}

function MatchModal({match,onClose}:{match:{name:string;conversationId?:string};onClose:()=>void}){return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-5 backdrop-blur-md"><div className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-violet-300/20 bg-[#0c101b] p-8 text-center shadow-[0_30px_120px_rgba(124,58,237,.3)]"><div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-violet-500/20 to-transparent"/><button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-slate-500 hover:bg-white/5 hover:text-white"><X size={18}/></button><div className="relative"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-400 shadow-[0_0_50px_rgba(168,85,247,.35)]"><Heart fill="white"/></div><div className="mt-6 text-xs font-black uppercase tracking-[.25em] text-violet-300">It's a match</div><h2 className="mt-2 text-4xl font-black tracking-tight">You + {match.name}</h2><p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-500">They liked you back. Your private chat is ready — go get that LP.</p><button onClick={onClose} className="mt-7 w-full rounded-2xl bg-white py-3.5 font-black text-slate-950">Open chat <ArrowRight className="ml-2 inline" size={17}/></button></div></div></div>}

function AuthModal({mode,setMode,onClose}:{mode:"signin"|"signup";setMode:(m:"signin"|"signup")=>void;onClose:()=>void}){const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [name,setName]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);const submit=async()=>{setBusy(true);setError("");let result:any;if(mode==="signin")result=await supabase.auth.signInWithPassword({email,password});else result=await supabase.auth.signUp({email,password,options:{data:{display_name:name||"Summoner"}}});if(result.error)setError(result.error.message);else if(mode==="signup"&&result.data.user){await supabase.from("profiles").upsert({id:result.data.user.id,display_name:name||"Summoner",onboarded:false});}setBusy(false);if(!result.error)onClose()};return <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4 backdrop-blur-md"><div className="w-full max-w-md rounded-[28px] border border-white/[.08] bg-[#0c101b] p-7 shadow-2xl"><div className="flex items-center justify-between"><Brand/><button onClick={onClose} className="text-slate-500 hover:text-white"><X/></button></div><h2 className="mt-8 text-2xl font-black">{mode==="signin"?"Welcome back.":"Create your LeagueMate."}</h2><p className="mt-1 text-sm text-slate-500">{mode==="signin"?"Jump back into the live queue.":"Your next duo could be one click away."}</p>{mode==="signup"&&<Field label="Display name"><input value={name} onChange={e=>setName(e.target.value)} className="input" placeholder="Summoner"/></Field>}<Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="input" placeholder="you@example.com"/></Field><Field label="Password"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="input" placeholder="••••••••"/></Field>{error&&<div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</div>}<button disabled={busy} onClick={submit} className="w-full rounded-2xl bg-white py-3.5 font-black text-slate-950 disabled:opacity-50">{busy?"Please wait…":mode==="signin"?"Sign in":"Create account"}</button><button onClick={()=>setMode(mode==="signin"?"signup":"signin")} className="mt-5 w-full text-center text-sm text-slate-500 hover:text-white">{mode==="signin"?"New here? Create an account":"Already have an account? Sign in"}</button></div></div>}

export default LeagueMateApp;
