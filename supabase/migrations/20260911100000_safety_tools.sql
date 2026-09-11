-- LeagueMate safety tools: block/report with authenticated-only RPCs.

ALTER TABLE public.blocks
  DROP CONSTRAINT IF EXISTS blocks_no_self;
ALTER TABLE public.blocks
  ADD CONSTRAINT blocks_no_self CHECK (blocker <> blocked);

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_no_self;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_no_self CHECK (reporter <> reported);
ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_reason_valid;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_reason_valid CHECK (reason IN ('toxic','harassment','spam','scam','fake_account','inappropriate','other'));

CREATE UNIQUE INDEX IF NOT EXISTS reports_open_unique
  ON public.reports (reporter, reported)
  WHERE status = 'open';

CREATE OR REPLACE FUNCTION public.block_user(_target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _target IS NULL OR _target = me THEN RAISE EXCEPTION 'Invalid target'; END IF;

  INSERT INTO public.blocks (blocker, blocked)
  VALUES (me, _target)
  ON CONFLICT DO NOTHING;

  UPDATE public.matches
     SET status = 'blocked', updated_at = now()
   WHERE ((user_a = me AND user_b = _target) OR (user_a = _target AND user_b = me))
     AND status <> 'blocked';

  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.block_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.unblock_user(_target uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.blocks WHERE blocker = me AND blocked = _target;
  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.unblock_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.report_user(_target uuid, _reason text, _details text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  rid uuid;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _target IS NULL OR _target = me THEN RAISE EXCEPTION 'You cannot report yourself'; END IF;
  IF _reason NOT IN ('toxic','harassment','spam','scam','fake_account','inappropriate','other') THEN
    RAISE EXCEPTION 'Invalid reason';
  END IF;
  IF (SELECT count(*) FROM public.reports r WHERE r.reporter = me AND r.created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'Too many reports, please try again later';
  END IF;

  INSERT INTO public.reports (reporter, reported, reason, details)
  VALUES (me, _target, _reason, NULLIF(left(coalesce(_details,''), 1000), ''))
  ON CONFLICT (reporter, reported) WHERE status = 'open'
  DO UPDATE SET details = coalesce(excluded.details, public.reports.details)
  RETURNING id INTO rid;

  RETURN jsonb_build_object('ok', true, 'report_id', rid);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.report_user(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_user(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_conversations()
RETURNS TABLE (
  conversation_id uuid, match_id uuid, other_user uuid, other_name text, other_avatar text,
  other_status text, other_last_seen timestamptz, last_message text, last_message_at timestamptz,
  unread int, match_score int, match_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT c.id, m.id, o.user_id, p.display_name, p.avatar_url,
         CASE WHEN ls.ended_at IS NULL AND ls.last_seen_at > now() - interval '90 seconds' THEN ls.status ELSE 'offline' END,
         ls.last_seen_at,
         (SELECT mm.body FROM public.messages mm WHERE mm.conversation_id = c.id ORDER BY mm.created_at DESC LIMIT 1),
         c.last_message_at,
         (SELECT count(*)::int FROM public.messages mm WHERE mm.conversation_id = c.id AND mm.sender_id <> me
            AND mm.created_at > coalesce(mine.last_read_at, 'epoch'::timestamptz)),
         m.score, m.status
  FROM public.conversation_members mine
  JOIN public.conversations c ON c.id = mine.conversation_id
  JOIN public.matches m ON m.id = c.match_id
  JOIN public.conversation_members o ON o.conversation_id = c.id AND o.user_id <> me
  JOIN public.profiles p ON p.id = o.user_id
  LEFT JOIN public.live_sessions ls ON ls.user_id = o.user_id
  WHERE mine.user_id = me
    AND m.status <> 'blocked'
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE (b.blocker = me AND b.blocked = o.user_id)
         OR (b.blocker = o.user_id AND b.blocked = me)
    )
  ORDER BY coalesce(c.last_message_at, m.created_at) DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.my_conversations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_conversations() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.bump_conversation() FROM PUBLIC, anon, authenticated;
