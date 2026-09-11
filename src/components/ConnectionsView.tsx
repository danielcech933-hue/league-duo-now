import { useEffect, useState } from "react";
import { Check, Clock3, MessageCircle, RefreshCw, UserMinus, UserPlus, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Connection = {
  connection_id: string;
  other_user: string;
  other_name: string;
  other_avatar?: string | null;
  status: "pending" | "accepted";
  requested_by_me: boolean;
  updated_at: string;
};

type Props = {
  onOpenChat?: (userId: string, name: string) => void;
};

export function ConnectionsView({ onOpenChat }: Props) {
  const [items, setItems] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("my_connections");
    if (error) setMessage(error.message);
    else setItems((data as Connection[] | null) || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      channel = supabase
        .channel(`connections-${data.user.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, () => void load())
        .subscribe();
    });
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const act = async (id: string, rpc: "accept_connection" | "decline_connection" | "remove_connection") => {
    setBusy(id);
    setMessage("");
    const { error } = await supabase.rpc(rpc, { _connection_id: id });
    setBusy(null);
    if (error) setMessage(error.message);
    else await load();
  };

  const incoming = items.filter((c) => c.status === "pending" && !c.requested_by_me);
  const outgoing = items.filter((c) => c.status === "pending" && c.requested_by_me);
  const friends = items.filter((c) => c.status === "accepted");

  return <div className="mx-auto max-w-6xl">
    <div className="flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Connections</h1>
        <p className="mt-1 text-sm text-slate-500">Keep good teammates around and find them again later.</p>
      </div>
      <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white"><RefreshCw size={14}/> Refresh</button>
    </div>

    {message && <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{message}</div>}

    {loading ? <div className="mt-7 rounded-3xl border border-white/[.07] bg-white/[.025] p-12 text-center text-sm text-slate-600">Loading connections…</div> : <div className="mt-7 space-y-5">
      {incoming.length > 0 && <ConnectionSection title="Incoming requests" count={incoming.length}>
        {incoming.map((c) => <ConnectionRow key={c.connection_id} c={c} busy={busy === c.connection_id} actions={<>
          <button disabled={busy === c.connection_id} onClick={() => void act(c.connection_id, "accept_connection")} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-50"><Check size={13}/> Accept</button>
          <button disabled={busy === c.connection_id} onClick={() => void act(c.connection_id, "decline_connection")} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-50"><X size={13}/> Decline</button>
        </>}/>)}</ConnectionSection>}

      {friends.length > 0 && <ConnectionSection title="Your teammates" count={friends.length}>
        {friends.map((c) => <ConnectionRow key={c.connection_id} c={c} busy={busy === c.connection_id} actions={<>
          {onOpenChat && <button onClick={() => onOpenChat(c.other_user, c.other_name)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200 hover:bg-violet-500/20"><MessageCircle size={13}/> Chat</button>}
          <button disabled={busy === c.connection_id} onClick={() => void act(c.connection_id, "remove_connection")} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-300 disabled:opacity-50"><UserMinus size={13}/> Remove</button>
        </>}/>)}</ConnectionSection>}

      {outgoing.length > 0 && <ConnectionSection title="Sent requests" count={outgoing.length}>
        {outgoing.map((c) => <ConnectionRow key={c.connection_id} c={c} busy={busy === c.connection_id} actions={<>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-500"><Clock3 size={13}/> Waiting</span>
          <button disabled={busy === c.connection_id} onClick={() => void act(c.connection_id, "remove_connection")} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-300 disabled:opacity-50"><X size={13}/> Cancel</button>
        </>}/>)}</ConnectionSection>}

      {items.length === 0 && <div className="rounded-3xl border border-white/[.07] bg-white/[.025] p-12 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/10 text-violet-300"><Users size={22}/></div>
        <h2 className="mt-4 text-xl font-black">No connections yet</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">After you match with someone, send a teammate request so you can find each other again without rematching.</p>
      </div>}
    </div>}
  </div>;
}

function ConnectionSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-3xl border border-white/[.07] bg-white/[.025]">
    <div className="flex items-center justify-between border-b border-white/[.06] px-5 py-4"><div className="font-black">{title}</div><span className="rounded-full bg-white/[.04] px-2 py-1 text-[10px] font-black text-slate-500">{count}</span></div>
    <div className="divide-y divide-white/[.05]">{children}</div>
  </section>;
}

function ConnectionRow({ c, actions }: { c: Connection; busy: boolean; actions: React.ReactNode }) {
  return <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
    {c.other_avatar ? <img src={c.other_avatar} alt="" className="h-12 w-12 rounded-full object-cover"/> : <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-sm font-black">{c.other_name.slice(0,2).toUpperCase()}</div>}
    <div className="min-w-0 flex-1"><div className="truncate font-bold">{c.other_name}</div><div className="mt-1 text-xs text-slate-600">{c.status === "accepted" ? "Connected teammate" : c.requested_by_me ? "Request sent" : "Wants to add you"}</div></div>
    <div className="flex flex-wrap gap-2">{actions}</div>
  </div>;
}

export async function sendConnectionRequest(target: string) {
  return supabase.rpc("send_connection_request", { _target: target });
}
