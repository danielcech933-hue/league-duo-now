revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_conversation_member(uuid, uuid) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_conversation_member(uuid, uuid) to authenticated, service_role;

-- rank helpers
create or replace function public.rank_value(_tier text, _division text default null)
returns int language sql immutable set search_path = public as $$
  select case upper(coalesce(_tier,'UNRANKED'))
    when 'IRON' then 0 when 'BRONZE' then 4 when 'SILVER' then 8 when 'GOLD' then 12
    when 'PLATINUM' then 16 when 'EMERALD' then 20 when 'DIAMOND' then 24
    when 'MASTER' then 28 when 'GRANDMASTER' then 30 when 'CHALLENGER' then 32
    else 14 end
  + case coalesce(_division,'') when 'IV' then 0 when 'III' then 1 when 'II' then 2 when 'I' then 3 else 0 end
$$;
revoke execute on function public.rank_value(text, text) from public, anon;
grant execute on function public.rank_value(text, text) to authenticated, service_role;

create or replace function public.roles_complementary(_a text, _b text)
returns boolean language sql immutable set search_path = public as $$
  select case
    when _a = 'FILL' or _b = 'FILL' then true
    when (_a = 'MID' and _b = 'JUNGLE') or (_a = 'JUNGLE' and _b = 'MID') then true
    when (_a = 'ADC' and _b = 'SUPPORT') or (_a = 'SUPPORT' and _b = 'ADC') then true
    when (_a = 'TOP' and _b = 'JUNGLE') or (_a = 'JUNGLE' and _b = 'TOP') then true
    else false end
$$;
revoke execute on function public.roles_complementary(text, text) from public, anon;
grant execute on function public.roles_complementary(text, text) to authenticated, service_role;

-- live count
create or replace function public.live_player_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.live_sessions
  where ended_at is null and status = 'looking' and last_seen_at > now() - interval '90 seconds'
$$;
revoke execute on function public.live_player_count() from public, anon;
grant execute on function public.live_player_count() to authenticated, service_role;

-- start / heartbeat / stop
create or replace function public.start_live_session(
  _game_mode text, _primary_role text, _secondary_role text, _languages text[],
  _voice text, _playstyle text, _region text, _rank_range text, _games_planned int, _note text default null
) returns public.live_sessions language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); v_rank text; result public.live_sessions;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.profiles p where p.id = me and (p.is_banned or coalesce(p.suspended_until, now()) > now())) then
    raise exception 'account restricted';
  end if;
  select coalesce(ra.rank_tier,'UNRANKED') || coalesce(' ' || ra.rank_division,'') into v_rank
    from public.riot_accounts ra where ra.user_id = me;
  insert into public.live_sessions as ls (user_id, status, game_mode, primary_role, secondary_role, languages, voice, playstyle, region, rank_snapshot, rank_range, games_planned, note, started_at, last_seen_at, ended_at)
  values (me,'looking', _game_mode, _primary_role, _secondary_role, coalesce(_languages,'{EN}'), _voice, _playstyle, _region, v_rank, _rank_range, greatest(coalesce(_games_planned,1),1), _note, now(), now(), null)
  on conflict (user_id) do update set
    status='looking', game_mode=excluded.game_mode, primary_role=excluded.primary_role,
    secondary_role=excluded.secondary_role, languages=excluded.languages, voice=excluded.voice,
    playstyle=excluded.playstyle, region=excluded.region, rank_snapshot=excluded.rank_snapshot,
    rank_range=excluded.rank_range, games_planned=excluded.games_planned, note=excluded.note,
    started_at=now(), last_seen_at=now(), ended_at=null
  returning * into result;
  insert into public.analytics_events(user_id, name, props) values (me,'live_session_started', jsonb_build_object('mode',_game_mode));
  return result;
end $$;
revoke execute on function public.start_live_session(text,text,text,text[],text,text,text,text,int,text) from public, anon;
grant execute on function public.start_live_session(text,text,text,text[],text,text,text,text,int,text) to authenticated;

create or replace function public.live_heartbeat(_status text default 'looking')
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return; end if;
  update public.live_sessions set last_seen_at = now(),
    status = case when _status in ('online','looking','in_game','away') then _status else status end
  where user_id = me and ended_at is null;
end $$;
revoke execute on function public.live_heartbeat(text) from public, anon;
grant execute on function public.live_heartbeat(text) to authenticated;

create or replace function public.stop_live_session()
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return; end if;
  update public.live_sessions set ended_at = now(), status='offline' where user_id = me and ended_at is null;
end $$;
revoke execute on function public.stop_live_session() from public, anon;
grant execute on function public.stop_live_session() to authenticated;

-- candidates with scoring
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
      as raw_score,
      array_remove(array[
        case when c.region = m_region then 'Same region' end,
        case when c.rv is not null and abs(c.rv - m_rank) <= 5 then 'Similar rank' end,
        case when public.roles_complementary(m_role, c.primary_role) then 'Complementary roles' end,
        case when c.languages && m_langs then 'Shared language' end,
        case when c.game_mode = m_mode then 'Same game mode' end,
        case when c.voice = m_voice and c.voice <> 'none' then 'Both use voice' end,
        case when c.playstyle = m_style then 'Same playstyle' end
      ], null) as why
    from cand c
  )
  select s.cid, s.display_name, s.avatar_url, s.bio, s.region, s.languages,
         s.primary_role, s.secondary_role, s.voice, s.playstyle, s.game_mode,
         s.rank_tier, s.rank_division, s.riot_id, s.wins, s.losses, s.note,
         s.games_planned, s.status, s.started_at,
         least(s.raw_score, 100)::int, s.why
  from scored s
  order by s.raw_score desc, s.started_at desc
  limit greatest(coalesce(_limit, 20), 1);
end $$;
revoke execute on function public.get_live_candidates(int) from public, anon;
grant execute on function public.get_live_candidates(int) to authenticated;

-- swipe (atomic match creation)
create or replace function public.swipe(_target uuid, _action text, _score int default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v_match public.matches; v_conv uuid; v_matched boolean := false;
  a uuid; b uuid; recent int; my_name text; their_name text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if _target = me then raise exception 'cannot swipe yourself'; end if;
  if _action not in ('like','pass','super_like') then raise exception 'invalid action'; end if;
  if exists (select 1 from public.blocks bl where (bl.blocker = me and bl.blocked = _target) or (bl.blocker = _target and bl.blocked = me)) then
    raise exception 'unavailable';
  end if;

  select count(*) into recent from public.swipes s where s.from_user = me and s.created_at > now() - interval '1 minute';
  if recent > 60 then raise exception 'slow down'; end if;

  insert into public.swipes (from_user, to_user, action) values (me, _target, _action)
  on conflict (from_user, to_user) do nothing;

  insert into public.analytics_events(user_id, name, props) values (me, _action, jsonb_build_object('target', _target));

  if _action in ('like','super_like') and exists (
    select 1 from public.swipes s where s.from_user = _target and s.to_user = me and s.action in ('like','super_like')
  ) then
    a := least(me, _target); b := greatest(me, _target);
    insert into public.matches (user_a, user_b, score) values (a, b, coalesce(_score,0))
    on conflict (user_a, user_b) do nothing;
    select * into v_match from public.matches where user_a = a and user_b = b;
    v_matched := true;

    insert into public.conversations (match_id) values (v_match.id) on conflict (match_id) do nothing;
    select id into v_conv from public.conversations where match_id = v_match.id;
    insert into public.conversation_members (conversation_id, user_id) values (v_conv, a), (v_conv, b)
    on conflict do nothing;

    select display_name into my_name from public.profiles where id = me;
    select display_name into their_name from public.profiles where id = _target;
    insert into public.notifications (user_id, type, title, body, data)
    values (_target, 'match', 'It''s a match!', my_name || ' wants to play with you.', jsonb_build_object('match_id', v_match.id, 'conversation_id', v_conv)),
           (me, 'match', 'It''s a match!', their_name || ' wants to play with you.', jsonb_build_object('match_id', v_match.id, 'conversation_id', v_conv));
    insert into public.analytics_events(user_id, name, props) values (me, 'match_created', jsonb_build_object('match_id', v_match.id));
    return jsonb_build_object('matched', true, 'match_id', v_match.id, 'conversation_id', v_conv);
  end if;

  if _action in ('like','super_like') then
    select display_name into my_name from public.profiles where id = me;
    insert into public.notifications (user_id, type, title, body, data)
    values (_target, 'like', 'Someone liked you', my_name || ' wants to duo.', jsonb_build_object('from', me));
  end if;

  return jsonb_build_object('matched', false);
end $$;
revoke execute on function public.swipe(uuid, text, int) from public, anon;
grant execute on function public.swipe(uuid, text, int) to authenticated;

-- conversation list helper
create or replace function public.my_conversations()
returns table (
  conversation_id uuid, match_id uuid, other_user uuid, other_name text, other_avatar text,
  other_status text, other_last_seen timestamptz, last_message text, last_message_at timestamptz,
  unread int, match_score int, match_status text
) language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return; end if;
  return query
  select c.id, m.id, o.user_id, p.display_name, p.avatar_url,
         case when ls.ended_at is null and ls.last_seen_at > now() - interval '90 seconds' then ls.status else 'offline' end,
         ls.last_seen_at,
         (select mm.body from public.messages mm where mm.conversation_id = c.id order by mm.created_at desc limit 1),
         c.last_message_at,
         (select count(*)::int from public.messages mm where mm.conversation_id = c.id and mm.sender_id <> me
            and mm.created_at > coalesce(mine.last_read_at, 'epoch'::timestamptz)),
         m.score, m.status
  from public.conversation_members mine
  join public.conversations c on c.id = mine.conversation_id
  join public.matches m on m.id = c.match_id
  join public.conversation_members o on o.conversation_id = c.id and o.user_id <> me
  join public.profiles p on p.id = o.user_id
  left join public.live_sessions ls on ls.user_id = o.user_id
  where mine.user_id = me
  order by coalesce(c.last_message_at, m.created_at) desc;
end $$;
revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;

-- bump conversation on new message
create or replace function public.bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  insert into public.notifications (user_id, type, title, body, data)
  select cm.user_id, 'message', 'New message', left(new.body, 80), jsonb_build_object('conversation_id', new.conversation_id)
  from public.conversation_members cm where cm.conversation_id = new.conversation_id and cm.user_id <> new.sender_id;
  return new;
end $$;
drop trigger if exists messages_bump on public.messages;
create trigger messages_bump after insert on public.messages for each row execute function public.bump_conversation();