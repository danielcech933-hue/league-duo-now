-- LeagueMate safety controls: atomic block/report RPCs and blocked-user filtering.

create or replace function public.block_user(_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if _target is null or _target = me then
    raise exception 'invalid target';
  end if;
  if not exists (select 1 from public.profiles where id = _target) then
    raise exception 'user not found';
  end if;

  insert into public.blocks (blocker, blocked)
  values (me, _target)
  on conflict (blocker, blocked) do nothing;

  insert into public.analytics_events(user_id, name, props)
  values (me, 'user_blocked', jsonb_build_object('target', _target));
end
$$;

revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;

create or replace function public.report_user(_target uuid, _reason text, _details text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  report_id uuid;
  clean_details text;
begin
  if me is null then
    raise exception 'not authenticated';
  end if;
  if _target is null or _target = me then
    raise exception 'invalid target';
  end if;
  if not exists (select 1 from public.profiles where id = _target) then
    raise exception 'user not found';
  end if;
  if _reason not in ('toxic','harassment','spam','scam','fake_account','inappropriate','other') then
    raise exception 'invalid report reason';
  end if;

  clean_details := nullif(left(trim(coalesce(_details, '')), 1000), '');

  insert into public.reports (reporter, reported, reason, details)
  values (me, _target, _reason, clean_details)
  returning id into report_id;

  insert into public.analytics_events(user_id, name, props)
  values (me, 'user_reported', jsonb_build_object('target', _target, 'reason', _reason));

  return report_id;
end
$$;

revoke execute on function public.report_user(uuid, text, text) from public, anon;
grant execute on function public.report_user(uuid, text, text) to authenticated;

-- Keep blocked users out of existing match/conversation lists as well as live matchmaking.
create or replace function public.my_conversations()
returns table (
  conversation_id uuid, match_id uuid, other_user uuid, other_name text, other_avatar text,
  other_status text, other_last_seen timestamptz, last_message text, last_message_at timestamptz,
  unread int, match_score int, match_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
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
    and not exists (
      select 1
      from public.blocks b
      where (b.blocker = me and b.blocked = o.user_id)
         or (b.blocker = o.user_id and b.blocked = me)
    )
  order by coalesce(c.last_message_at, m.created_at) desc;
end
$$;

revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;
