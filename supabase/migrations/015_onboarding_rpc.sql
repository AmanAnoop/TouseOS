-- Onboarding RPCs (service role or SECURITY DEFINER for org creation)

CREATE OR REPLACE FUNCTION create_onboarding_org(
  p_user_id UUID,
  p_name TEXT,
  p_type TEXT,
  p_campus TEXT DEFAULT NULL,
  p_council TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org organizations%ROWTYPE;
BEGIN
  INSERT INTO organizations (name, type, campus, council_or_league, contact_email)
  VALUES (p_name, p_type::org_type, p_campus, p_council, p_contact_email)
  RETURNING * INTO v_org;

  INSERT INTO org_members (org_id, user_id, role, status)
  VALUES (v_org.id, p_user_id, 'owner', 'active')
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = 'owner', status = 'active';

  INSERT INTO member_profiles (org_id, user_id, full_name, email, role, membership_status)
  SELECT v_org.id, p_user_id, COALESCE(pr.full_name, split_part(COALESCE(pr.email, 'member@local'), '@', 1)), COALESCE(pr.email, 'member@local'), 'owner', 'active'
  FROM profiles pr WHERE pr.id = p_user_id
    AND NOT EXISTS (SELECT 1 FROM member_profiles mp WHERE mp.org_id = v_org.id AND mp.user_id = p_user_id);

  RETURN jsonb_build_object(
    'id', v_org.id,
    'name', v_org.name,
    'invite_code', v_org.invite_code
  );
END;
$$;

CREATE OR REPLACE FUNCTION join_org_by_invite_code(
  p_user_id UUID,
  p_invite_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org organizations%ROWTYPE;
BEGIN
  SELECT * INTO v_org FROM organizations
  WHERE upper(invite_code) = upper(trim(p_invite_code))
  LIMIT 1;

  IF v_org.id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  INSERT INTO org_members (org_id, user_id, role, status)
  VALUES (v_org.id, p_user_id, 'general_member', 'active')
  ON CONFLICT (org_id, user_id) DO UPDATE SET status = 'active';

  INSERT INTO member_profiles (org_id, user_id, full_name, email, role, membership_status)
  SELECT v_org.id, p_user_id, COALESCE(pr.full_name, split_part(COALESCE(pr.email, 'member@local'), '@', 1)), COALESCE(pr.email, 'member@local'), 'general_member', 'active'
  FROM profiles pr WHERE pr.id = p_user_id
    AND NOT EXISTS (SELECT 1 FROM member_profiles mp WHERE mp.org_id = v_org.id AND mp.user_id = p_user_id);

  RETURN jsonb_build_object('id', v_org.id, 'name', v_org.name);
END;
$$;
