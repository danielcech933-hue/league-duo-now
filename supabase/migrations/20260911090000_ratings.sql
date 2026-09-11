-- LeagueMate post-match ratings.

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
