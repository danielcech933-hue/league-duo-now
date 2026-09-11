-- guard rails
alter table public.blocks drop constraint if exists blocks_no_self;
alter table public.blocks add constraint blocks_no_self check (blocker <> blocked);
alter table public.reports drop constraint if exists reports_no_self;
alter table public.reports add constraint reports_no_self check (reporter <> reported);
alter table public.reports drop constraint if exists reports_reason_valid;
alter table public.reports add constraint reports_reason_valid check (reason in ('toxic','harassment','spam','scam','fake_account','inappropriate','other'));

create unique index if not exists reports_open_unique on public.reports (reporter, reported) where status = 'open';

-- block a user: record block + mark any shared match as blocked (messages preserved)
create or replace function public.block_user(_target uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if _target is null or _target = me then raise exception 'Invalid target'; end if;

  insert into public.blocks (blocker, blocked) values (me, _target)
  on conflict do nothing;

  update public.matches
     set status = 'blocked', updated_at = now()
   where ((user_a = me and user_b = _target) or (user_a = _target and user_b = me))
     and status <> 'blocked';

  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;

create or replace function public.unblock_user(_target uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated'; end if;
  delete from public.blocks where blocker = me and blocked = _target;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.unblock_user(uuid) from public, anon;
grant execute on function public.unblock_user(uuid) to authenticated;

-- report a user
create or replace function public.report_user(_target uuid, _reason text, _details text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); rid uuid;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if _target is null or _target = me then raise exception 'You cannot report yourself'; end if;
  if _reason not in ('toxic','harassment','spam','scam','fake_account','inappropriate','other') then
    raise exception 'Invalid reason';
  end if;
  if (select count(*) from public.reports r where r.reporter = me and r.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many reports, please try again later';
  end if;

  insert into public.reports (reporter, reported, reason, details)
  values (me, _target, _reason, nullif(left(coalesce(_details,''), 1000), ''))
  on conflict (reporter, reported) where status = 'open'
  do update set details = coalesce(excluded.details, public.reports.details)
  returning id into rid;

  return jsonb_build_object('ok', true, 'report_id', rid);
end $$;
revoke execute on function public.report_user(uuid, text, text) from public, anon;
grant execute on function public.report_user(uuid, text, text) to authenticated;

-- hide conversations with blocked users from the list (history stays in db)
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
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = me and b.blocked = o.user_id)
         or (b.blocker = o.user_id and b.blocked = me)
    )
  order by coalesce(c.last_message_at, m.created_at) desc;
end $$;
revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;