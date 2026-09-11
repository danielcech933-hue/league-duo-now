-- LeagueMate teammate connections: persistent friend requests after a match.

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_a < user_b),
  check (created_by = user_a or created_by = user_b),
  check (user_a <> user_b),
  unique (user_a, user_b)
);

create index if not exists connections_user_a_idx on public.connections(user_a, status, updated_at desc);
create index if not exists connections_user_b_idx on public.connections(user_b, status, updated_at desc);

grant select on public.connections to authenticated;
grant all on public.connections to service_role;
alter table public.connections enable row level security;

create policy "read own connections" on public.connections
  for select to authenticated
  using (auth.uid() in (user_a, user_b));

create trigger connections_touch
before update on public.connections
for each row execute function public.touch_updated_at();

create or replace function public.send_connection_request(_target uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  low_user uuid;
  high_user uuid;
  existing_id uuid;
  existing_status text;
  connection_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if _target is null or _target = me then raise exception 'invalid target'; end if;
  if not exists (select 1 from public.profiles where id = _target) then raise exception 'user not found'; end if;

  if exists (
    select 1 from public.blocks b
    where (b.blocker = me and b.blocked = _target)
       or (b.blocker = _target and b.blocked = me)
  ) then
    raise exception 'user unavailable';
  end if;

  if not exists (
    select 1 from public.matches m
    where (m.user_a = least(me, _target) and m.user_b = greatest(me, _target))
      and m.status <> 'closed'
  ) then
    raise exception 'connection requires a match';
  end if;

  low_user := least(me, _target);
  high_user := greatest(me, _target);

  select c.id, c.status into existing_id, existing_status
  from public.connections c
  where c.user_a = low_user and c.user_b = high_user;

  if existing_id is not null then
    if existing_status = 'accepted' then
      return existing_id;
    end if;

    update public.connections
      set status = 'pending', created_by = me, updated_at = now()
    where id = existing_id;
    connection_id := existing_id;
  else
    insert into public.connections(user_a, user_b, status, created_by)
    values(low_user, high_user, 'pending', me)
    returning id into connection_id;
  end if;

  insert into public.notifications(user_id, type, title, body, data)
  values(
    _target,
    'connection_request',
    'New teammate request',
    (select p.display_name || ' wants to stay connected after your match.' from public.profiles p where p.id = me),
    jsonb_build_object('connection_id', connection_id, 'from_user', me)
  );

  return connection_id;
end
$$;

create or replace function public.accept_connection(_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  requester uuid;
  other uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select created_by,
         case when user_a = me then user_b else user_a end
    into requester, other
  from public.connections
  where id = _connection_id
    and me in (user_a, user_b)
    and status = 'pending';

  if not found then raise exception 'connection request not found'; end if;
  if requester = me then raise exception 'cannot accept your own request'; end if;

  update public.connections
  set status = 'accepted', updated_at = now()
  where id = _connection_id;

  insert into public.notifications(user_id, type, title, body, data)
  values(
    requester,
    'connection_accepted',
    'Teammate request accepted',
    (select p.display_name || ' accepted your teammate request.' from public.profiles p where p.id = me),
    jsonb_build_object('connection_id', _connection_id, 'user_id', me)
  );
end
$$;

create or replace function public.decline_connection(_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  requester uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select created_by into requester
  from public.connections
  where id = _connection_id
    and me in (user_a, user_b)
    and status = 'pending';

  if not found then raise exception 'connection request not found'; end if;
  if requester = me then raise exception 'cannot decline your own request'; end if;

  delete from public.connections where id = _connection_id;
end
$$;

create or replace function public.remove_connection(_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from public.connections
  where id = _connection_id
    and auth.uid() in (user_a, user_b);
end
$$;

create or replace function public.my_connections()
returns table (
  connection_id uuid,
  other_user uuid,
  other_name text,
  other_avatar text,
  status text,
  requested_by_me boolean,
  updated_at timestamptz
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
  select c.id,
         case when c.user_a = me then c.user_b else c.user_a end,
         p.display_name,
         p.avatar_url,
         c.status,
         c.created_by = me,
         c.updated_at
  from public.connections c
  join public.profiles p on p.id = case when c.user_a = me then c.user_b else c.user_a end
  where me in (c.user_a, c.user_b)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = me and b.blocked = case when c.user_a = me then c.user_b else c.user_a end)
         or (b.blocker = case when c.user_a = me then c.user_b else c.user_a end and b.blocked = me)
    )
  order by case when c.status = 'pending' and c.created_by <> me then 0 else 1 end, c.updated_at desc;
end
$$;

revoke execute on function public.send_connection_request(uuid) from public, anon;
revoke execute on function public.accept_connection(uuid) from public, anon;
revoke execute on function public.decline_connection(uuid) from public, anon;
revoke execute on function public.remove_connection(uuid) from public, anon;
grant execute on function public.send_connection_request(uuid) to authenticated;
grant execute on function public.accept_connection(uuid) to authenticated;
grant execute on function public.decline_connection(uuid) to authenticated;
grant execute on function public.remove_connection(uuid) to authenticated;
grant execute on function public.my_connections() to authenticated;

-- Realtime updates for instant request/accept/remove UI refresh.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'connections'
     ) then
    alter publication supabase_realtime add table public.connections;
  end if;
end
$$;
