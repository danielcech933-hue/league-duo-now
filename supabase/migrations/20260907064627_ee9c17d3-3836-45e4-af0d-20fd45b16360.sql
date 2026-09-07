-- ============ LEAGUEMATE CORE SCHEMA ============
create extension if not exists pgcrypto;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.games to authenticated, anon;
grant all on public.games to service_role;
alter table public.games enable row level security;
create policy "games readable" on public.games for select to authenticated, anon using (true);
insert into public.games (slug, name) values ('lol','League of Legends') on conflict do nothing;

do $$ begin
  create type public.app_role as enum ('admin','moderator','user');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create table if not exists public.profiles (
  id uuid primary key,
  display_name text not null default 'Summoner',
  avatar_url text,
  bio text,
  region text not null default 'EUNE',
  languages text[] not null default '{EN}',
  primary_role text not null default 'FILL' check (primary_role in ('TOP','JUNGLE','MID','ADC','SUPPORT','FILL')),
  secondary_role text not null default 'FILL' check (secondary_role in ('TOP','JUNGLE','MID','ADC','SUPPORT','FILL')),
  voice text not null default 'preferred' check (voice in ('required','preferred','none')),
  playstyle text not null default 'chill' check (playstyle in ('chill','competitive','serious','fun','learning')),
  play_times text[] not null default '{}',
  onboarded boolean not null default false,
  is_banned boolean not null default false,
  suspended_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles readable by authenticated" on public.profiles for select to authenticated using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "admins update profiles" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create table if not exists public.riot_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  game_name text not null,
  tag_line text not null,
  region text not null,
  puuid text,
  verified boolean not null default false,
  rank_tier text check (rank_tier in ('IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER','GRANDMASTER','CHALLENGER','UNRANKED')),
  rank_division text,
  league_points int,
  profile_level int,
  wins int,
  losses int,
  top_champions text[],
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_name, tag_line, region)
);
grant select, insert, update, delete on public.riot_accounts to authenticated;
grant all on public.riot_accounts to service_role;
alter table public.riot_accounts enable row level security;
create policy "riot accounts readable" on public.riot_accounts for select to authenticated using (true);
create policy "manage own riot account" on public.riot_accounts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger riot_touch before update on public.riot_accounts for each row execute function public.touch_updated_at();

create table if not exists public.player_preferences (
  user_id uuid primary key,
  game_mode text not null default 'ranked_solo' check (game_mode in ('ranked_solo','ranked_flex','normal','aram','any')),
  rank_range text not null default 'pm1' check (rank_range in ('same','pm1','pm2','any')),
  roles_wanted text[] not null default '{}',
  languages text[] not null default '{EN}',
  voice_pref text not null default 'preferred' check (voice_pref in ('required','preferred','none')),
  playstyle text not null default 'chill',
  region_lock boolean not null default true,
  session_length int not null default 2,
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.player_preferences to authenticated;
grant all on public.player_preferences to service_role;
alter table public.player_preferences enable row level security;
create policy "read own prefs" on public.player_preferences for select to authenticated using (user_id = auth.uid());
create policy "write own prefs" on public.player_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  status text not null default 'looking' check (status in ('online','looking','in_game','away','offline')),
  game_mode text not null default 'ranked_solo',
  primary_role text not null default 'FILL',
  secondary_role text not null default 'FILL',
  languages text[] not null default '{EN}',
  voice text not null default 'preferred',
  playstyle text not null default 'chill',
  region text not null default 'EUNE',
  rank_snapshot text,
  rank_range text not null default 'pm1',
  games_planned int not null default 2,
  note text,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists live_sessions_active_idx on public.live_sessions (status, last_seen_at desc) where ended_at is null;
create index if not exists live_sessions_region_idx on public.live_sessions (region);
grant select, insert, update, delete on public.live_sessions to authenticated;
grant all on public.live_sessions to service_role;
alter table public.live_sessions enable row level security;
create policy "live sessions readable" on public.live_sessions for select to authenticated using (true);
create policy "manage own session" on public.live_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null,
  to_user uuid not null,
  action text not null check (action in ('like','pass','super_like')),
  created_at timestamptz not null default now(),
  unique (from_user, to_user),
  check (from_user <> to_user)
);
create index if not exists swipes_to_idx on public.swipes (to_user, action);
grant select, insert on public.swipes to authenticated;
grant all on public.swipes to service_role;
alter table public.swipes enable row level security;
create policy "read own swipes" on public.swipes for select to authenticated using (from_user = auth.uid() or to_user = auth.uid());
create policy "insert own swipes" on public.swipes for insert to authenticated with check (from_user = auth.uid());

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null,
  user_b uuid not null,
  score int not null default 0,
  status text not null default 'matched' check (status in ('matched','chat','invited','in_party','in_game','finished','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);
create index if not exists matches_a_idx on public.matches (user_a);
create index if not exists matches_b_idx on public.matches (user_b);
grant select, update on public.matches to authenticated;
grant all on public.matches to service_role;
alter table public.matches enable row level security;
create policy "read own matches" on public.matches for select to authenticated using (auth.uid() in (user_a, user_b));
create policy "update own matches" on public.matches for update to authenticated
  using (auth.uid() in (user_a, user_b)) with check (auth.uid() in (user_a, user_b));
create trigger matches_touch before update on public.matches for each row execute function public.touch_updated_at();

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);
create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create index if not exists conv_members_user_idx on public.conversation_members (user_id);
grant select on public.conversations to authenticated;
grant all on public.conversations to service_role;
grant select, update on public.conversation_members to authenticated;
grant all on public.conversation_members to service_role;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;

create or replace function public.is_conversation_member(_conversation_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members m where m.conversation_id = _conversation_id and m.user_id = _user_id)
$$;

create policy "read own conversations" on public.conversations for select to authenticated
  using (public.is_conversation_member(id, auth.uid()));
create policy "read own membership" on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "update own membership" on public.conversation_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at desc);
grant select, insert, update on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "read messages in own conversations" on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));
create policy "send messages in own conversations" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_member(conversation_id, auth.uid()));
create policy "mark read" on public.messages for update to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()))
  with check (public.is_conversation_member(conversation_id, auth.uid()));

create table if not exists public.blocks (
  blocker uuid not null,
  blocked uuid not null,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
grant select, insert, delete on public.blocks to authenticated;
grant all on public.blocks to service_role;
alter table public.blocks enable row level security;
create policy "read own blocks" on public.blocks for select to authenticated using (blocker = auth.uid());
create policy "create own blocks" on public.blocks for insert to authenticated with check (blocker = auth.uid());
create policy "delete own blocks" on public.blocks for delete to authenticated using (blocker = auth.uid());

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid not null,
  reported uuid not null,
  reason text not null check (reason in ('toxic','harassment','spam','scam','fake_account','inappropriate','other')),
  details text,
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now(),
  check (reporter <> reported)
);
create index if not exists reports_reported_idx on public.reports (reported);
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "read own reports" on public.reports for select to authenticated
  using (reporter = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'moderator'));
create policy "create reports" on public.reports for insert to authenticated with check (reporter = auth.uid());
create policy "moderators update reports" on public.reports for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'moderator'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'moderator'));

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  rater uuid not null,
  rated uuid not null,
  verdict text not null check (verdict in ('great','okay','bad')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (match_id, rater),
  check (rater <> rated)
);
grant select, insert on public.ratings to authenticated;
grant all on public.ratings to service_role;
alter table public.ratings enable row level security;
create policy "ratings readable" on public.ratings for select to authenticated using (true);
create policy "rate teammates" on public.ratings for insert to authenticated
  with check (rater = auth.uid() and exists (
    select 1 from public.matches m where m.id = match_id and auth.uid() in (m.user_a, m.user_b) and rated in (m.user_a, m.user_b)
  ));

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notif_user_idx on public.notifications (user_id, created_at desc);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "update own notifications" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists analytics_name_idx on public.analytics_events (name, created_at desc);
grant insert on public.analytics_events to authenticated;
grant select on public.analytics_events to authenticated;
grant all on public.analytics_events to service_role;
alter table public.analytics_events enable row level security;
create policy "insert own events" on public.analytics_events for insert to authenticated with check (user_id = auth.uid());
create policy "admins read events" on public.analytics_events for select to authenticated using (public.has_role(auth.uid(),'admin'));

alter table public.live_sessions replica identity full;
alter table public.messages replica identity full;
alter table public.matches replica identity full;
alter table public.notifications replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.live_sessions;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;