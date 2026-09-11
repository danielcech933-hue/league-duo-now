-- LeagueMate duo history migration.
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
create policy "read own duo history" on public.duo_games for select to authenticated using (auth.uid() in (user_a,user_b));
create policy "record own duo history" on public.duo_games for insert to authenticated with check (recorded_by=auth.uid() and auth.uid() in (user_a,user_b));
create or replace function public.record_duo_game(_other uuid,_result text default 'unknown',_game_mode text default 'ranked_solo',_note text default null) returns uuid language plpgsql security definer set search_path=public as $$ declare me uuid:=auth.uid(); idv uuid; begin if me is null then raise exception 'not authenticated'; end if; if _other is null or _other=me then raise exception 'invalid teammate'; end if; if _result not in ('win','loss','unknown') then raise exception 'invalid result'; end if; if not exists(select 1 from public.profiles where id=_other) then raise exception 'user not found'; end if; if not exists(select 1 from public.matches m where m.user_a=least(me,_other) and m.user_b=greatest(me,_other) and m.status<>'closed') then raise exception 'game history requires a match'; end if; insert into public.duo_games(user_a,user_b,recorded_by,result,game_mode,note) values(least(me,_other),greatest(me,_other),me,_result,left(trim(_game_mode),40),nullif(left(trim(coalesce(_note,'')),240),'')) returning id into idv; return idv; end $$;
create or replace function public.duo_history(_other uuid) returns table(played_together int,wins int,losses int,unknown_results int,last_played_at timestamptz) language sql stable security definer set search_path=public as $$ select count(*)::int,count(*) filter(where result='win')::int,count(*) filter(where result='loss')::int,count(*) filter(where result='unknown')::int,max(created_at) from public.duo_games where user_a=least(auth.uid(),_other) and user_b=greatest(auth.uid(),_other) $$;
grant execute on function public.record_duo_game(uuid,text,text,text) to authenticated;
grant execute on function public.duo_history(uuid) to authenticated;
