-- LeagueMate reputation: aggregate rating stats and a bounded matchmaking modifier.

create or replace function public.player_reputation(_user uuid)
returns table (
  rating_count int,
  great_count int,
  okay_count int,
  bad_count int,
  great_pct int,
  reputation_score int
)
language sql
stable
security definer
set search_path = public
as $$
  with stats as (
    select
      count(*)::int as rating_count,
      count(*) filter (where verdict = 'great')::int as great_count,
      count(*) filter (where verdict = 'okay')::int as okay_count,
      count(*) filter (where verdict = 'bad')::int as bad_count
    from public.ratings
    where rated = _user
  )
  select
    rating_count,
    great_count,
    okay_count,
    bad_count,
    case when rating_count = 0 then 0 else round(great_count * 100.0 / rating_count)::int end as great_pct,
    case
      when rating_count = 0 then 0
      else least(15, greatest(-15,
        round(((great_count * 1.0) - (bad_count * 1.5)) / greatest(rating_count, 1) * 15)::int
      ))
    end as reputation_score
  from stats;
$$;

revoke execute on function public.player_reputation(uuid) from public, anon;
grant execute on function public.player_reputation(uuid) to authenticated, service_role;

-- Extend candidate scoring with a small reputation signal. New users are neutral.
create or replace function public.get_live_candidates(_limit int default 20)
returns table (
  user_id uuid, display_name text, avatar_url text, bio text, region text, languages text[],
  primary_role text, secondary_role text, voice text, playstyle text, game_mode text,
  rank_tier text, rank_division text, riot_id text, wins int, losses int, note text,
  games_planned int, status text, live_since timestamptz, score int, reasons text[]
) language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  m_region text; m_langs text[]; m_role text; m_role2 text; m_mode text; m_voice text;
  m_style text; m_rank int; m_range text; m_games int; m_lock boolean;
begin
  if me is null then return; end if;
  select coalesce(ls.region, p.region), coalesce(ls.languages, p.languages), coalesce(ls.primary_role, p.primary_role),
         coalesce(ls.secondary_role, p.secondary_role), coalesce(ls.game_mode, pr.game_mode, 'ranked_solo'),
         coalesce(ls.voice, p.voice), coalesce(ls.playstyle, p.playstyle),
         public.rank_value(ra.rank_tier, ra.rank_division), coalesce(ls.rank_range, pr.rank_range, 'pm1'),
         coalesce(ls.games_planned, pr.session_length, 2), coalesce(pr.region_lock, true)
  into m_region, m_langs, m_role, m_role2, m_mode, m_voice, m_style, m_rank, m_range, m_games, m_lock
  from public.profiles p
  left join public.live_sessions ls on ls.user_id = p.id and ls.ended_at is null
  left join public.player_preferences pr on pr.user_id = p.id
  left join public.riot_accounts ra on ra.user_id = p.id
  where p.id = me;

  return query
  with cand as (
    select ls.user_id as cid, ls.*, p.display_name, p.avatar_url, p.bio,
           ra.rank_tier, ra.rank_division, ra.wins, ra.losses,
           case when ra.game_name is not null then ra.game_name || '#' || ra.tag_line else null end as riot_id,
           public.rank_value(ra.rank_tier, ra.rank_division) as rv
    from public.live_sessions ls
    join public.profiles p on p.id = ls.user_id
    left join public.riot_accounts ra on ra.user_id = ls.user_id
    where ls.ended_at is null
      and ls.status = 'looking'
      and ls.last_seen_at > now() - interval '90 seconds'
      and ls.user_id <> me
      and p.is_banned = false
      and coalesce(p.suspended_until, now() - interval '1 second') <= now()
      and not exists (select 1 from public.swipes s where s.from_user = me and s.to_user = ls.user_id)
      and not exists (select 1 from public.blocks b where (b.blocker = me and b.blocked = ls.user_id) or (b.blocker = ls.user_id and b.blocked = me))
      and not exists (select 1 from public.matches mm where (mm.user_a = least(me, ls.user_id) and mm.user_b = greatest(me, ls.user_id)))
      and (not m_lock or ls.region = m_region)
  ), scored as (
    select c.*,
      (case when c.region = m_region then 20 else 0 end)
      + (case when m_range = 'any' or c.rv is null then 12
              when m_range = 'same' and abs(c.rv - m_rank) <= 3 then 20
              when m_range = 'pm1' and abs(c.rv - m_rank) <= 5 then 20
              when m_range = 'pm2' and abs(c.rv - m_rank) <= 9 then 18
              when abs(c.rv - m_rank) <= 12 then 8 else 0 end)
      + (case when public.roles_complementary(m_role, c.primary_role) then 20
              when c.primary_role <> m_role then 12 else 4 end)
      + (case when public.roles_complementary(m_role2, c.primary_role) or public.roles_complementary(m_role, c.secondary_role) then 15 else 0 end)
      + (case when c.languages && m_langs then 10 else 0 end)
      + (case when c.game_mode = m_mode then 10 else 0 end)
      + (case when c.playstyle = m_style then 5 else 0 end)
      + (case when abs(c.games_planned - m_games) <= 1 then 5 else 0 end)
      + (case when c.voice = m_voice then 5 else 0 end)
      + (case when exists (select 1 from public.ratings r where r.rater = me and r.rated = c.cid and r.verdict = 'great') then 10 else 0 end)
      + coalesce((select reputation_score from public.player_reputation(c.cid)), 0)
      as raw_score,
      array_remove(array[
        case when c.region = m_region then 'Same region' end,
        case when c.rv is not null and abs(c.rv - m_rank) <= 5 then 'Similar rank' end,
        case when public.roles_complementary(m_role, c.primary_role) then 'Complementary roles' end,
        case when c.languages && m_langs then 'Shared language' end,
        case when c.game_mode = m_mode then 'Same game mode' end,
        case when c.voice = m_voice and c.voice <> 'none' then 'Both use voice' end,
        case when c.playstyle = m_style then 'Same playstyle' end,
        case when coalesce((select reputation_score from public.player_reputation(c.cid)), 0) >= 5 then 'Strong reputation' end
      ], null) as why
    from cand c
  )
  select s.cid, s.display_name, s.avatar_url, s.bio, s.region, s.languages,
         s.primary_role, s.secondary_role, s.voice, s.playstyle, s.game_mode,
         s.rank_tier, s.rank_division, s.riot_id, s.wins, s.losses, s.note,
         s.games_planned, s.status, s.started_at,
         least(greatest(s.raw_score, 0), 100)::int, s.why
  from scored s
  order by s.raw_score desc, s.started_at desc
  limit greatest(coalesce(_limit, 20), 1);
end $$;

revoke execute on function public.get_live_candidates(int) from public, anon;
grant execute on function public.get_live_candidates(int) to authenticated;
