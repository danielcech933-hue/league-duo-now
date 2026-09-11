import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Swords } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ConnectionsView } from "@/components/ConnectionsView";

export const Route = createFileRoute("/connections")({ component: ConnectionsRoute });

function ConnectionsRoute() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
      setChecking(false);
    });
  }, []);

  if (checking) return <div className="grid min-h-screen place-items-center bg-[#070a12] text-white">Loading…</div>;

  if (!signedIn) return <div className="grid min-h-screen place-items-center bg-[#070a12] p-6 text-white"><div className="w-full max-w-md rounded-3xl border border-white/[.07] bg-white/[.025] p-8 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-violet-500"><Swords size={20}/></div><h1 className="mt-5 text-2xl font-black">LeagueMate</h1><p className="mt-2 text-sm text-slate-500">Sign in to manage your teammate connections.</p><button onClick={() => void navigate({ to: "/" })} className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-black text-slate-950">Back to LeagueMate</button></div></div>;

  return <div className="min-h-screen bg-[#070a12] p-4 text-white sm:p-6"><div className="mx-auto mb-5 flex max-w-6xl items-center justify-between"><button onClick={() => void navigate({ to: "/" })} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft size={14}/> Back</button><div className="text-sm font-black text-slate-500">LeagueMate</div></div><ConnectionsView /></div>;
}
