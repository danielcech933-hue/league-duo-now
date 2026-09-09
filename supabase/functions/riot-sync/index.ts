import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLATFORM: Record<string, { platform: string; regional: string }> = {
  EUW: { platform: "euw1", regional: "europe" },
  EUNE: { platform: "eun1", regional: "europe" },
  NA: { platform: "na1", regional: "americas" },
  BR: { platform: "br1", regional: "americas" },
  LAN: { platform: "la1", regional: "americas" },
  LAS: { platform: "la2", regional: "americas" },
  OCE: { platform: "oc1", regional: "sea" },
  TR: { platform: "tr1", regional: "europe" },
  RU: { platform: "ru", regional: "europe" },
  JP: { platform: "jp1", regional: "asia" },
  KR: { platform: "kr", regional: "asia" },
  SG: { platform: "sg2", regional: "sea" },
  TW: { platform: "tw2", regional: "sea" },
  VN: { platform: "vn2", regional: "sea" },
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

async function riotFetch<T>(url: string, apiKey: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "X-Riot-Token": apiKey, Accept: "application/json" },
  });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Riot API ${response.status}`);
    (error as any).status = response.status;
    (error as any).details = text.slice(0, 300);
    throw error;
  }
  return await response.json() as T;
}

async function championNames(ids: number[]) {
  if (!ids.length) return [] as string[];
  try {
    const versions = await fetch("https://ddragon.leagueoflegends.com/api/versions.json").then(r => r.json()) as string[];
    const version = versions?.[0];
    if (!version) return [];
    const data = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`).then(r => r.json()) as { data: Record<string, { key: string; name: string }> };
    const byId = new Map(Object.values(data.data).map(c => [c.key, c.name]));
    return ids.map(id => byId.get(String(id))).filter(Boolean) as string[];
  } catch {
    return [] as string[];
  }
}

type Account = { puuid: string; gameName: string; tagLine: string };
type Summoner = { id: string; puuid: string; summonerLevel: number };
type LeagueEntry = { queueType: string; tier: string; rank: string; leaguePoints: number; wins: number; losses: number };
type Mastery = { championId: number; championLevel: number; championPoints: number };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const riotKey = Deno.env.get("RIOT_API_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "server_not_configured" }, 500);
  if (!riotKey) return json({ error: "riot_api_key_missing", message: "RIOT_API_KEY is not configured." }, 503);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  let gameName = "";
  let tagLine = "";
  let region = "";
  try {
    const body = await req.json();
    gameName = clean(body.gameName, 80);
    tagLine = clean(body.tagLine, 20).replace(/^#/, "");
    region = clean(body.region, 10).toUpperCase();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const routing = PLATFORM[region];
  if (!gameName || !tagLine || !routing) return json({ error: "invalid_riot_id", message: "Enter a valid Riot ID and supported League region." }, 400);

  try {
    const account = await riotFetch<Account>(
      `https://${routing.regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      riotKey,
    );
    const summoner = await riotFetch<Summoner>(
      `https://${routing.platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(account.puuid)}`,
      riotKey,
    );
    const leagues = await riotFetch<LeagueEntry[]>(
      `https://${routing.platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${encodeURIComponent(summoner.id)}`,
      riotKey,
    );
    const solo = leagues.find(l => l.queueType === "RANKED_SOLO_5x5");
    const masteries = await riotFetch<Mastery[]>(
      `https://${routing.platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(account.puuid)}/top?count=3`,
      riotKey,
    );
    const topChampions = await championNames(masteries.map(m => m.championId));

    const payload = {
      user_id: user.id,
      game_name: account.gameName,
      tag_line: account.tagLine,
      region,
      puuid: account.puuid,
      verified: true,
      rank_tier: solo?.tier ?? "UNRANKED",
      rank_division: solo?.rank ?? null,
      league_points: solo?.leaguePoints ?? null,
      profile_level: summoner.summonerLevel ?? null,
      wins: solo?.wins ?? 0,
      losses: solo?.losses ?? 0,
      top_champions: topChampions,
      synced_at: new Date().toISOString(),
      last_error: null,
    };

    const { data, error } = await admin.from("riot_accounts").upsert(payload, { onConflict: "user_id" }).select().single();
    if (error) throw error;
    return json({ ok: true, account: data });
  } catch (error) {
    const status = Number((error as any)?.status ?? 500);
    const code = status === 404 ? "riot_account_not_found" : status === 429 ? "riot_rate_limited" : status === 403 ? "riot_forbidden" : "riot_sync_failed";
    const message = status === 404
      ? "Riot ID was not found. Check the game name, tag line and region."
      : status === 429
        ? "Riot is rate limiting requests. Try again in a moment."
        : status === 403
          ? "Riot API rejected the request. Check the server API key."
          : "Riot account sync failed. Please try again.";

    await admin.from("riot_accounts").upsert({
      user_id: user.id, game_name: gameName, tag_line: tagLine, region,
      verified: false, last_error: code,
    }, { onConflict: "user_id" });
    return json({ error: code, message }, status >= 400 && status < 500 ? status : 502);
  }
});
