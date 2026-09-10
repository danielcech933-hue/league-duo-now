import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset password — LeagueMate" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Recovery links arrive with type=recovery in the URL hash; the supabase
    // client exchanges it for a session automatically.
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: any) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setDone(true);
    setTimeout(() => navigate({ to: "/" }), 1800);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[#070a12] p-4 text-white">
      <div className="relative w-full max-w-md rounded-[28px] border border-white/[.08] bg-[#0d111c]/95 p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 rounded-t-[28px] bg-gradient-to-b from-violet-500/[.12] to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500"><Swords size={18} /></div>
            <span className="font-black">LeagueMate</span>
          </div>
          <h1 className="mt-7 text-2xl font-black tracking-tight">Set a new password</h1>
          <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>
          {!ready && !done && (
            <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-300">
              This page only works from the password reset link in your email.
            </div>
          )}
          {done ? (
            <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-300">
              Password updated. Redirecting you back…
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4">
              <label className="block">
                <span className="label">New password</span>
                <input type="password" required minLength={6} className="input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </label>
              {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">{error}</div>}
              <button type="submit" disabled={busy || !ready} className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-3.5 font-black text-white shadow-lg shadow-violet-500/25 transition hover:brightness-110 disabled:opacity-50">
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
