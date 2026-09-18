alter table public.profiles add column if not exists gender text;
alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check
  check (gender is null or gender in ('male','female','non_binary','other','undisclosed'));

create table if not exists public.duo_games (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  recorded_by uuid not null references public.profiles(id) on delete cascade,
  result text not null default 'unknown' check (result in ('win','loss','unknown')),
  game_mode text not null default 'ranked_solo',
  note text,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  check (recorded_by = user_a or recorded_by = user_b),
  check (user_a <> user_b)
);
create index if not exists duo_games_pair_idx on public.duo_games(user_a,user_b,created_at desc);
grant select,insert on public.duo_games to authenticated;
grant all on public.duo_games to service_role;
alter table public.duo_games enable row level security;
drop policy if exists "read own duo history" on public.duo_games;
create policy "read own duo history" on public.duo_games for select to authenticated using (auth.uid() in (user_a,user_b));
drop policy if exists "record own duo history" on public.duo_games;
create policy "record own duo history" on public.duo_games for insert to authenticated with check (recorded_by=auth.uid() and auth.uid() in (user_a,user_b));

create or replace function public.record_duo_game(_other uuid,_result text default 'unknown',_game_mode text default 'ranked_solo',_note text default null) returns uuid language plpgsql security definer set search_path=public as $$ declare me uuid:=auth.uid(); idv uuid; begin if me is null then raise exception 'not authenticated'; end if; if _other is null or _other=me then raise exception 'invalid teammate'; end if; if _result not in ('win','loss','unknown') then raise exception 'invalid result'; end if; if not exists(select 1 from public.profiles where id=_other) then raise exception 'user not found'; end if; if not exists(select 1 from public.matches m where m.user_a=least(me,_other) and m.user_b=greatest(me,_other) and m.status<>'closed') then raise exception 'game history requires a match'; end if; insert into public.duo_games(user_a,user_b,recorded_by,result,game_mode,note) values(least(me,_other),greatest(me,_other),me,_result,left(trim(_game_mode),40),nullif(left(trim(coalesce(_note,'')),240),'')) returning id into idv; return idv; end $$;

create or replace function public.duo_history(_other uuid) returns table(played_together int,wins int,losses int,unknown_results int,last_played_at timestamptz) language sql stable security definer set search_path=public as $$ select count(*)::int,count(*) filter(where result='win')::int,count(*) filter(where result='loss')::int,count(*) filter(where result='unknown')::int,max(created_at) from public.duo_games where user_a=least(auth.uid(),_other) and user_b=greatest(auth.uid(),_other) $$;

revoke execute on function public.record_duo_game(uuid,text,text,text) from public, anon;
revoke execute on function public.duo_history(uuid) from public, anon;
grant execute on function public.record_duo_game(uuid,text,text,text) to authenticated;
grant execute on function public.duo_history(uuid) to authenticated;

create or replace function public.submit_rating(
  _match_id uuid,
  _rated uuid,
  _verdict text,
  _tags text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  rating_id uuid;
  normalized_tags text[];
begin
  if me is null then raise exception 'not authenticated'; end if;
  if _match_id is null or _rated is null or _rated = me then raise exception 'invalid rating target'; end if;
  if _verdict not in ('great','okay','bad') then raise exception 'invalid verdict'; end if;

  if not exists (
    select 1 from public.matches m
    where m.id = _match_id
      and me in (m.user_a, m.user_b)
      and _rated in (m.user_a, m.user_b)
      and me <> _rated
  ) then
    raise exception 'match not found';
  end if;

  normalized_tags := array(
    select distinct left(trim(x), 40)
    from unnest(coalesce(_tags, '{}')) as x
    where trim(x) <> ''
    limit 6
  );

  insert into public.ratings (match_id, rater, rated, verdict, tags)
  values (_match_id, me, _rated, _verdict, normalized_tags)
  on conflict (match_id, rater) do update set
    rated = excluded.rated,
    verdict = excluded.verdict,
    tags = excluded.tags;

  select id into rating_id
  from public.ratings
  where match_id = _match_id and rater = me;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    _rated,
    'rating',
    'New teammate rating',
    'Your teammate left feedback after the match.',
    jsonb_build_object('match_id', _match_id, 'rating_id', rating_id)
  );

  insert into public.analytics_events(user_id, name, props)
  values (
    me,
    'rating_submitted',
    jsonb_build_object('match_id', _match_id, 'rated', _rated, 'verdict', _verdict)
  );

  return rating_id;
end
$$;

revoke execute on function public.submit_rating(uuid, uuid, text, text[]) from public, anon;
grant execute on function public.submit_rating(uuid, uuid, text, text[]) to authenticated;