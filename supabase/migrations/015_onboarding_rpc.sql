-- Onboarding RPCs: allow authenticated users to create/join orgs without service role key

CREATE OR REPLACE FUNCTION public.create_onboarding_org(
  p_name TEXT,
  p_type org_type,
  p_campus TEXT DEFAULT NULL,
  p_council_or_league TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_org organizations%ROWTYPE;
  v_full_name TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM org_members
    WHERE user_id = v_user AND status <> 'removed'
  ) THEN
    RAISE EXCEPTION 'You already belong to an organization';
  END IF;

  v_full_name := COALESCE(
    NULLIF(trim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    split_part(COALESCE(auth.jwt() ->> 'email', 'member'), '@', 1),
    'Chapter Admin'
  );

  INSERT INTO organizations (name, type, campus, council_or_league, contact_email)
  VALUES (
    trim(p_name),
    p_type,
    NULLIF(trim(p_campus), ''),
    NULLIF(trim(p_council_or_league), ''),
    COALESCE(NULLIF(trim(p_contact_email), ''), auth.jwt() ->> 'email')
  )
  RETURNING * INTO v_org;

  INSERT INTO profiles (id, full_name)
  VALUES (v_user, v_full_name)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO org_members (org_id, user_id, role, status)
  VALUES (v_org.id, v_user, 'owner', 'active');

  INSERT INTO member_profiles (org_id, user_id, full_name, email, role, membership_status)
  VALUES (
    v_org.id,
    v_user,
    v_full_name,
    COALESCE(auth.jwt() ->> 'email', ''),
    'owner',
    'active'
  );

  INSERT INTO audit_logs (org_id, actor_id, action, resource_type, resource_id, metadata)
  VALUES (
    v_org.id,
    v_user,
    'org_created',
    'organizations',
    v_org.id::TEXT,
    jsonb_build_object('name', v_org.name, 'type', v_org.type)
  );

  RETURN jsonb_build_object(
    'id', v_org.id,
    'name', v_org.name,
    'type', v_org.type,
    'invite_code', v_org.invite_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.join_org_by_invite_code(p_invite_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_org organizations%ROWTYPE;
  v_full_name TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM org_members
    WHERE user_id = v_user AND status <> 'removed'
  ) THEN
    RAISE EXCEPTION 'You already belong to an organization';
  END IF;

  SELECT * INTO v_org
  FROM organizations
  WHERE invite_code = upper(trim(p_invite_code));

  IF v_org.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  v_full_name := COALESCE(
    NULLIF(trim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    split_part(COALESCE(auth.jwt() ->> 'email', 'member'), '@', 1),
    'New Member'
  );

  INSERT INTO profiles (id, full_name)
  VALUES (v_user, v_full_name)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO org_members (org_id, user_id, role, status)
  VALUES (v_org.id, v_user, 'general_member', 'pending_invite')
  ON CONFLICT (org_id, user_id) DO UPDATE SET status = 'pending_invite';

  IF NOT EXISTS (
    SELECT 1 FROM member_profiles
    WHERE org_id = v_org.id AND user_id = v_user
  ) THEN
    INSERT INTO member_profiles (org_id, user_id, full_name, email, role, membership_status)
    VALUES (
      v_org.id,
      v_user,
      v_full_name,
      COALESCE(auth.jwt() ->> 'email', ''),
      'general_member',
      'pending_invite'
    );
  END IF;

  RETURN jsonb_build_object(
    'id', v_org.id,
    'name', v_org.name,
    'type', v_org.type,
    'status', 'pending_invite'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_onboarding_org(TEXT, org_type, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_org_by_invite_code(TEXT) TO authenticated;
