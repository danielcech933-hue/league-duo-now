create or replace function public.invite_duo(_other uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); my_name text; recent int;
begin
  if me is null then raise exception 'Not authenticated'; end if;
  if _other is null or _other = me then raise exception 'Invalid teammate'; end if;
  if exists (select 1 from public.blocks where (blocker = me and blocked = _other) or (blocker = _other and blocked = me)) then
    raise exception 'Cannot invite this player';
  end if;
  select count(*) into recent from public.notifications
    where user_id = _other and type = 'duo_invite' and data->>'from' = me::text and created_at > now() - interval '10 minutes';
  if recent > 0 then raise exception 'Invitation already sent recently'; end if;
  select coalesce(display_name, 'A teammate') into my_name from public.profiles where id = me;
  insert into public.notifications (user_id, type, title, body, data)
  values (_other, 'duo_invite', 'Play again?', my_name || ' wants to duo again.', jsonb_build_object('from', me, 'name', my_name));
end $$;
revoke execute on function public.invite_duo(uuid) from public, anon;
grant execute on function public.invite_duo(uuid) to authenticated;
