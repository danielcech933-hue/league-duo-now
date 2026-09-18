import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, Swords } from "lucide-react";
import { RiotConnect } from "@/components/RiotConnect";

export const Route = createFileRoute("/riot")({
  component: RiotPage,
  head: () => ({
    meta: [
      { title: "Connect your Riot ID | LeagueMate" },
      { name: "description", content: "Verify your Riot ID so LeagueMate can use your real rank, level and champions in League of Legends matchmaking." },
      { property: "og:title", content: "Connect your Riot ID | LeagueMate" },
      { property: "og:description", content: "Verify your Riot ID and let teammates find you by your real League of Legends identity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function RiotPage() {
  return <div className="min-h-screen bg-[#070a12] text-white">
    <header className="mx-auto flex max-w-5xl items-center gap-4 border-b border-white/[.06] px-5 py-5">
      <a href="/" className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500"><Swords size={19} /></a>
      <div><div className="font-black">LeagueMate</div><div className="text-xs text-slate-500">Riot account</div></div>
    </header>
    <main className="mx-auto max-w-5xl px-5 py-10">
      <a href="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-white"><ChevronLeft size={16} /> Back</a>
      <div className="mt-7"><RiotConnect /></div>
    </main>
  </div>;
}

export default RiotPage;
