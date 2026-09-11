import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Clock3, Heart, MessageCircle, UserPlus, X, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, any> | null;
  read_at?: string | null;
  created_at: string;
};

type Props = {
  onClose: () => void;
  onNavigate?: (notification: NotificationRow) => void;
  onUnreadChange?: (count: number) => void;
};

const iconFor = (type: string) => {
  if (type === "match") return <Heart size={15} />;
  if (type === "connection_request" || type === "connection_accepted") return <UserPlus size={15} />;
  if (type === "duo_invite") return <Zap size={15} />;
  if (type === "message" || type === "new_message") return <MessageCircle size={15} />;
  return <Bell size={15} />;
};

const labelFor = (type: string) => {
  if (type === "match") return "Match";
  if (type === "connection_request") return "Teammate request";
  if (type === "connection_accepted") return "Teammate added";
  if (type === "duo_invite") return "Play again";
  if (type === "message" || type === "new_message") return "Message";
  return "Notification";
};

const formatTime = (value: string) => {
  const date = new Date(value);
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit" });
};

export function NotificationCenter({ onClose, onNavigate, onUnreadChange }: Props) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const unread = useMemo(() => items.filter((n) => !n.read_at).length, [items]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id,type,title,body,data,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    const next = (data as NotificationRow[] | null) || [];
    setItems(next);
    onUnreadChange?.(next.filter((n) => !n.read_at).length);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    const channelPromise = supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return null;
      return supabase
        .channel(`notification-center-${data.user.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${data.user.id}` }, () => void load())
        .subscribe();
    });
    return () => {
      void channelPromise.then((channel) => { if (channel) void supabase.removeChannel(channel); });
    };
  }, []);

  const markRead = async (id: string) => {
    const now = new Date().toISOString();
    setItems((current) => current.map((n) => n.id === id ? { ...n, read_at: now } : n));
    await supabase.from("notifications").update({ read_at: now }).eq("id", id);
    onUnreadChange?.(Math.max(0, unread - 1));
  };

  const markAllRead = async () => {
    if (!unread || busy) return;
    setBusy(true);
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).is("read_at", null);
    setItems((current) => current.map((n) => ({ ...n, read_at: n.read_at || now })));
    onUnreadChange?.(0);
    setBusy(false);
  };

  const open = async (notification: NotificationRow) => {
    if (!notification.read_at) await markRead(notification.id);
    onNavigate?.(notification);
  };

  return <div className="absolute right-0 top-11 z-[80] w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/[.08] bg-[#0d111c]/98 shadow-2xl backdrop-blur-xl">
    <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-3">
      <div><div className="flex items-center gap-2 text-sm font-black"><Bell size={15} className="text-violet-300"/> Notifications</div><div className="mt-0.5 text-[10px] text-slate-600">{unread ? `${unread} unread` : "All caught up"}</div></div>
      <div className="flex items-center gap-1">
        <button onClick={() => void markAllRead()} disabled={!unread || busy} className="rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-500 hover:bg-white/[.05] hover:text-white disabled:opacity-40"><CheckCheck size={13} className="mr-1 inline"/>Mark all read</button>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-white/[.05] hover:text-white" aria-label="Close"><X size={15}/></button>
      </div>
    </div>
    <div className="max-h-[min(520px,70vh)] overflow-y-auto">
      {loading ? <div className="p-10 text-center text-xs text-slate-600">Loading notifications…</div> : items.length === 0 ? <div className="p-10 text-center"><div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-300"><Bell size={18}/></div><div className="mt-3 text-sm font-bold">No notifications yet</div><div className="mt-1 text-xs text-slate-600">Matches, teammate requests and play-again invites will show up here.</div></div> : <div className="divide-y divide-white/[.05]">{items.map((notification) => <button key={notification.id} onClick={() => void open(notification)} className={`flex w-full gap-3 p-4 text-left transition hover:bg-white/[.03] ${notification.read_at ? "opacity-60" : "bg-violet-500/[.035]"}`}><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300">{iconFor(notification.type)}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="text-[11px] font-bold uppercase tracking-wider text-violet-300">{labelFor(notification.type)}</div>{!notification.read_at && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-300"/>}</div><div className="mt-1 text-sm font-black text-white">{notification.title}</div>{notification.body && <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{notification.body}</div>}<div className="mt-2 flex items-center gap-1 text-[10px] text-slate-600"><Clock3 size={11}/>{formatTime(notification.created_at)}</div></div></button>)}</div>}
    </div>
  </div>;
}
