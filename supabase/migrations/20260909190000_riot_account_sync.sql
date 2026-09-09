-- LeagueMate Riot account sync hardening
-- Riot credentials are used only by the Edge Function; never expose the Riot API key to the browser.

alter table public.riot_accounts
  add column if not exists last_error text;

create index if not exists riot_accounts_verified_idx
  on public.riot_accounts (verified, synced_at desc);

comment on column public.riot_accounts.last_error is 'Last non-secret Riot sync error shown to the account owner.';
