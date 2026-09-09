# Riot API setup

LeagueMate keeps the Riot API key server-side in the `riot-sync` Supabase Edge Function. The browser never receives the key.

## 1. Riot Developer Portal

Create a Riot developer key in the Riot Developer Portal. Development keys are intended for prototyping and expire every 24 hours; a public product should use the appropriate production key after Riot approves the product. See Riot's official API documentation for current requirements.

## 2. Supabase secret

Add the key to the Supabase project as an Edge Function secret:

`RIOT_API_KEY=<your-riot-api-key>`

Do not put this value in `.env`, Vite client code, GitHub source, or the browser.

## 3. Edge Function

The function is:

`supabase/functions/riot-sync/index.ts`

It requires an authenticated Supabase user and accepts:

```json
{
  "gameName": "PlayerName",
  "tagLine": "EUW",
  "region": "EUW"
}
```

It then uses Riot ID -> PUUID -> summoner -> ranked data -> champion mastery, and stores the verified result in `public.riot_accounts`.

## 4. Frontend

The connected account UI is available at `/riot` and calls the authenticated `riot-sync` Edge Function.

## Riot API routing

Riot ID lookup uses the regional routing cluster, while League summoner/ranked/mastery calls use the platform routing value for the selected region. This follows Riot's current Riot ID and regional routing model.
