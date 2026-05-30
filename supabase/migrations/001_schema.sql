-- ============================================================
-- TouseOS – Supabase schema + RLS
-- Run against a fresh Supabase project.
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Helpers ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ── Enums ───────────────────────────────────────────────────
CREATE TYPE org_type AS ENUM (
  'fraternity','sorority','club_sports','general_org','university'
);
CREATE TYPE member_status AS ENUM (
  'active','pending_invite','inactive','alumni','removed','advisor','admin'
);
CREATE TYPE payment_status AS ENUM (
  'pending','paid','overdue','failed','refunded','waived','partial'
);
CREATE TYPE event_type AS ENUM (
  'chapter_meeting','recruitment','mixer','formal','date_party',
  'brotherhood','sisterhood','philanthropy','service','tailgate',
  'alumni_event','new_member_education','standards','retreat',
  'practice','game','tournament','tryout','team_meeting','fundraiser',
  'travel','conditioning','volunteer','other'
);
CREATE TYPE pnm_status AS ENUM (
  'lead','contacted','invited','attended','interested','high_priority',
  'bid_discussion','bid_extended','accepted','declined','removed'
);
CREATE TYPE reimbursement_status AS ENUM (
  'submitted','needs_info','approved','rejected','paid'
);
CREATE TYPE photo_status AS ENUM (
  'pending','approved','chapter_only','do_not_post','flagged','removed'
);
CREATE TYPE task_status AS ENUM ('todo','in_progress','done','cancelled');
CREATE TYPE task_priority AS ENUM ('low','medium','high','urgent');
CREATE TYPE waiver_status AS ENUM ('missing','completed','expired');

-- ============================================================
-- CORE TABLES
-- ============================================================

-- ── User profiles (extends auth.users) ──────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  preferred_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  notification_email BOOLEAN DEFAULT true,
  notification_sms BOOLEAN DEFAULT true,
  notification_push BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Organizations ────────────────────────────────────────────
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type org_type NOT NULL,
  campus TEXT,
  council_or_league TEXT,
  contact_email TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#059669',
  secondary_color TEXT DEFAULT '#065f46',
  privacy TEXT DEFAULT 'private' CHECK (privacy IN ('public','private')),
  invite_code TEXT UNIQUE DEFAULT upper(substr(encode(gen_random_bytes(4),'hex'),1,8)),
  settings JSONB DEFAULT '{}',
  stripe_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_organizations_type ON organizations(type);

-- ── Organization members (role assignment) ───────────────────
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'general_member',
  status member_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, user_id)
);
CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);

-- ── Member profiles (rich per-org profile) ──────────────────
CREATE TABLE member_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  preferred_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  class_year TEXT,
  graduation_year INT,
  major TEXT,
  hometown TEXT,
  birthday DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  profile_photo_url TEXT,
  membership_status member_status DEFAULT 'active',
  role TEXT DEFAULT 'general_member',
  committees TEXT[] DEFAULT '{}',
  social_links JSONB DEFAULT '{}',
  notes TEXT,
  -- sports-specific
  jersey_number TEXT,
  position TEXT,
  uniform_size TEXT,
  is_injured BOOLEAN DEFAULT false,
  -- computed
  payment_status TEXT DEFAULT 'current',
  attendance_rate INT DEFAULT 100,
  forms_completed INT DEFAULT 0,
  forms_required INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_member_profiles_updated BEFORE UPDATE ON member_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_member_profiles_org ON member_profiles(org_id);
CREATE INDEX idx_member_profiles_user ON member_profiles(user_id);
CREATE INDEX idx_member_profiles_status ON member_profiles(org_id, membership_status);

-- ── Audit logs ───────────────────────────────────────────────
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_audit_logs_org ON audit_logs(org_id, created_at DESC);

-- ── Announcements ────────────────────────────────────────────
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT[] DEFAULT '{"all"}',
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_announcements_org ON announcements(org_id, created_at DESC);

-- ── Notifications ────────────────────────────────────────────
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at NULLS FIRST, created_at DESC);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type event_type DEFAULT 'other',
  description TEXT,
  location TEXT,
  address TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  cover_image_url TEXT,
  theme TEXT,
  dress_code TEXT,
  playlist_url TEXT,
  rsvp_enabled BOOLEAN DEFAULT true,
  rsvp_limit INT,
  waitlist_enabled BOOLEAN DEFAULT false,
  show_guest_list BOOLEAN DEFAULT false,
  require_forms TEXT[] DEFAULT '{}',
  co_host_org_ids UUID[] DEFAULT '{}',
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low','medium','high','critical')),
  risk_approved BOOLEAN DEFAULT false,
  risk_approved_by UUID REFERENCES auth.users(id),
  budget_amount NUMERIC(12,2),
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('draft','upcoming','live','past','cancelled')),
  is_private BOOLEAN DEFAULT false,
  alcohol BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_events_org ON events(org_id, starts_at);
CREATE INDEX idx_events_starts ON events(starts_at);

CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES member_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name TEXT,
  status TEXT DEFAULT 'going' CHECK (status IN ('going','not_going','maybe','waitlist')),
  checked_in BOOLEAN DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, member_id)
);
CREATE INDEX idx_event_rsvps_event ON event_rsvps(event_id);
CREATE INDEX idx_event_rsvps_member ON event_rsvps(member_id);

CREATE TABLE event_guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  affiliation TEXT,
  checked_in BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_event_guests_event ON event_guests(event_id);

CREATE TABLE event_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  votes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PAYMENTS & DUES
-- ============================================================
CREATE TABLE payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'dues',
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE,
  recurring BOOLEAN DEFAULT false,
  recurring_interval TEXT CHECK (recurring_interval IN ('weekly','monthly','semesterly','annually')),
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  stripe_price_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_payment_items_org ON payment_items(org_id);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES member_profiles(id) ON DELETE CASCADE,
  payment_item_id UUID REFERENCES payment_items(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  status payment_status DEFAULT 'pending',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_invoice_id TEXT,
  method TEXT DEFAULT 'stripe' CHECK (method IN ('stripe','cash','venmo','zelle','check','waived','other')),
  notes TEXT,
  receipt_url TEXT,
  late_fee NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_payments_org ON payments(org_id);
CREATE INDEX idx_payments_member ON payments(member_id);
CREATE INDEX idx_payments_status ON payments(org_id, status);

CREATE TABLE payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  installments INT NOT NULL DEFAULT 2,
  installment_amount NUMERIC(12,2) NOT NULL,
  schedule JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reimbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by_name TEXT,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  receipt_url TEXT,
  status reimbursement_status DEFAULT 'submitted',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_reimbursements_updated BEFORE UPDATE ON reimbursements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_reimbursements_org ON reimbursements(org_id);

CREATE TABLE budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('annual','semester','event')),
  fiscal_year INT,
  semester TEXT CHECK (semester IN ('spring','fall')),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  total_budget NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  description TEXT,
  budgeted NUMERIC(12,2) DEFAULT 0,
  actual NUMERIC(12,2) DEFAULT 0,
  notes TEXT
);

-- ============================================================
-- PNM RECRUITMENT
-- ============================================================
CREATE TABLE pnm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  instagram_handle TEXT,
  class_year TEXT,
  major TEXT,
  hometown TEXT,
  interests TEXT[] DEFAULT '{}',
  referral_source TEXT,
  active_member_connection TEXT,
  status pnm_status DEFAULT 'lead',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  communication_consent BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  consent_source TEXT,
  opted_out BOOLEAN DEFAULT false,
  opted_out_at TIMESTAMPTZ,
  campaign TEXT,
  event_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_pnm_leads_updated BEFORE UPDATE ON pnm_leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_pnm_leads_org ON pnm_leads(org_id, status);

CREATE TABLE pnm_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pnm_id UUID NOT NULL REFERENCES pnm_leads(id) ON DELETE CASCADE,
  evaluator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evaluator_name TEXT,
  character INT CHECK (character BETWEEN 1 AND 5),
  involvement INT CHECK (involvement BETWEEN 1 AND 5),
  leadership_potential INT CHECK (leadership_potential BETWEEN 1 AND 5),
  academic_seriousness INT CHECK (academic_seriousness BETWEEN 1 AND 5),
  mutual_interest INT CHECK (mutual_interest BETWEEN 1 AND 5),
  social_fit INT CHECK (social_fit BETWEEN 1 AND 5),
  risk_concern INT CHECK (risk_concern BETWEEN 1 AND 5),
  comments TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_pnm_evaluations_pnm ON pnm_evaluations(pnm_id);

CREATE TABLE pnm_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pnm_id UUID NOT NULL REFERENCES pnm_leads(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  strength INT DEFAULT 3 CHECK (strength BETWEEN 1 AND 5),
  is_follow_up_owner BOOLEAN DEFAULT false,
  notes TEXT,
  UNIQUE (pnm_id, member_id)
);

CREATE TABLE pnm_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pnm_id UUID REFERENCES pnm_leads(id) ON DELETE CASCADE,
  to_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  twilio_sid TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','failed','undelivered')),
  is_mass_send BOOLEAN DEFAULT false,
  campaign TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  error_message TEXT
);
CREATE INDEX idx_pnm_texts_org ON pnm_texts(org_id, sent_at DESC);
CREATE INDEX idx_pnm_texts_pnm ON pnm_texts(pnm_id);

CREATE TABLE sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT DEFAULT 'pnm',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PHOTOS & SOCIAL
-- ============================================================
CREATE TABLE photo_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT false,
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMPTZ,
  allow_member_upload BOOLEAN DEFAULT true,
  co_host_org_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_photo_albums_org ON photo_albums(org_id);

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploader_name TEXT,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  status photo_status DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  is_instagram_ready BOOLEAN DEFAULT false,
  is_officer_only BOOLEAN DEFAULT false,
  do_not_post BOOLEAN DEFAULT false,
  alcohol_flagged BOOLEAN DEFAULT false,
  width INT,
  height INT,
  file_size_bytes INT,
  likes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_photos_album ON photos(album_id, status);
CREATE INDEX idx_photos_org ON photos(org_id);

CREATE TABLE photo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name TEXT,
  album_id UUID REFERENCES photo_albums(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  fulfillments INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE social_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  caption TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  post_type TEXT DEFAULT 'feed' CHECK (post_type IN ('feed','story','reel','carousel')),
  photo_ids UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','posted','cancelled')),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  platform TEXT[] DEFAULT '{"instagram"}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_social_calendar_org ON social_calendar(org_id, scheduled_date);

-- ============================================================
-- TASKS & DOCUMENTS
-- ============================================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'todo',
  priority task_priority DEFAULT 'medium',
  due_date DATE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_tasks_org ON tasks(org_id, status, due_date);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  file_size_bytes INT,
  mime_type TEXT,
  is_private BOOLEAN DEFAULT false,
  required_by_roles TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_documents_org ON documents(org_id, category);

CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'general',
  fields JSONB NOT NULL DEFAULT '[]',
  is_required BOOLEAN DEFAULT false,
  required_roles TEXT[] DEFAULT '{}',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  member_id UUID REFERENCES member_profiles(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}',
  signature TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_form_responses_form ON form_responses(form_id);

-- ============================================================
-- RISK MANAGEMENT
-- ============================================================
CREATE TABLE risk_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  alcohol_policy BOOLEAN DEFAULT false,
  sober_monitors_assigned BOOLEAN DEFAULT false,
  guest_ratio_checked BOOLEAN DEFAULT false,
  venue_contract_uploaded BOOLEAN DEFAULT false,
  transportation_plan BOOLEAN DEFAULT false,
  security_plan BOOLEAN DEFAULT false,
  emergency_plan BOOLEAN DEFAULT false,
  food_water_plan BOOLEAN DEFAULT false,
  risk_score INT,
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE incident_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,
  incident_date TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  involved_parties TEXT,
  evidence_urls TEXT[] DEFAULT '{}',
  severity TEXT DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','referred')),
  advisor_escalated BOOLEAN DEFAULT false,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_incident_reports_org ON incident_reports(org_id, created_at DESC);

-- ============================================================
-- STANDARDS & ACCOUNTABILITY
-- ============================================================
CREATE TABLE standards_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  respondent_id UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  respondent_name TEXT,
  case_type TEXT NOT NULL CHECK (case_type IN ('attendance','dues','conduct','other')),
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','hearing_scheduled','resolved','appealed','closed')),
  sanctions TEXT[] DEFAULT '{}',
  restorative_actions JSONB DEFAULT '[]',
  notes TEXT,
  hearing_date TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_standards_cases_org ON standards_cases(org_id, status);

-- ============================================================
-- NEW MEMBER EDUCATION
-- ============================================================
CREATE TABLE nme_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  order_index INT DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  quiz_questions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE nme_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES nme_modules(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  score INT,
  completed_at TIMESTAMPTZ,
  UNIQUE (member_id, module_id)
);

CREATE TABLE big_little_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  big_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  little_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested','confirmed','revealed')),
  match_score INT,
  reveal_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ALUMNI & PHILANTHROPY
-- ============================================================
CREATE TABLE alumni_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES member_profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  graduation_year INT,
  pledge_class TEXT,
  city TEXT,
  state TEXT,
  career_field TEXT,
  employer TEXT,
  giving_history NUMERIC(12,2) DEFAULT 0,
  mentorship_interest BOOLEAN DEFAULT false,
  contact_preference TEXT DEFAULT 'email',
  last_contacted TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_alumni_profiles_org ON alumni_profiles(org_id);

CREATE TABLE philanthropy_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_amount NUMERIC(12,2),
  raised_amount NUMERIC(12,2) DEFAULT 0,
  beneficiary TEXT,
  start_date DATE,
  end_date DATE,
  public_page_slug TEXT UNIQUE,
  stripe_payment_link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES philanthropy_campaigns(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  donor_name TEXT,
  donor_email TEXT,
  amount NUMERIC(12,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INTERCHAPTER FEATURES
-- ============================================================
CREATE TABLE interchapter_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposing_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  target_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_type event_type DEFAULT 'mixer',
  proposed_dates JSONB DEFAULT '[]',
  estimated_attendance INT,
  theme_ideas TEXT,
  venue_ideas TEXT,
  budget_estimate NUMERIC(12,2),
  cost_split_proposal TEXT,
  transportation_needs TEXT,
  alcohol BOOLEAN DEFAULT false,
  risk_level TEXT DEFAULT 'low',
  philanthropy_beneficiary TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','counter_proposed','cancelled')),
  response_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE interchapter_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  poster_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  idea_type TEXT NOT NULL,
  estimated_cost NUMERIC(12,2),
  risk_level TEXT DEFAULT 'low',
  upvotes INT DEFAULT 0,
  saved_by_org_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  notes TEXT,
  cancellation_policy TEXT,
  insurance_required BOOLEAN DEFAULT false,
  reliability_rating INT CHECK (reliability_rating BETWEEN 1 AND 5),
  would_use_again BOOLEAN,
  total_spent NUMERIC(12,2) DEFAULT 0,
  contract_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_vendors_org ON vendors(org_id, category);

-- ============================================================
-- HOUSING
-- ============================================================
CREATE TABLE housing_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  capacity INT DEFAULT 1,
  floor INT,
  monthly_rent NUMERIC(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE housing_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES housing_rooms(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  move_in DATE,
  move_out DATE,
  deposit_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  room_id UUID REFERENCES housing_rooms(id) ON DELETE SET NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  priority task_priority DEFAULT 'medium',
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SPORTSOSSPECIFIC TABLES
-- ============================================================
CREATE TABLE sports_tryouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT,
  candidate_phone TEXT,
  position TEXT,
  experience_level TEXT DEFAULT 'beginner' CHECK (experience_level IN ('beginner','intermediate','advanced','elite')),
  prior_teams TEXT,
  availability TEXT,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered','attended','invited','waitlisted','cut','accepted')),
  overall_score NUMERIC(4,2),
  athletic_ability INT CHECK (athletic_ability BETWEEN 1 AND 5),
  position_fit INT CHECK (position_fit BETWEEN 1 AND 5),
  experience_score INT CHECK (experience_score BETWEEN 1 AND 5),
  coachability INT CHECK (coachability BETWEEN 1 AND 5),
  teamwork INT CHECK (teamwork BETWEEN 1 AND 5),
  culture_fit INT CHECK (culture_fit BETWEEN 1 AND 5),
  notes TEXT,
  tryout_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sports_tryouts_org ON sports_tryouts(org_id, status);

CREATE TABLE sports_waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  waiver_type TEXT NOT NULL CHECK (waiver_type IN (
    'liability','concussion','emergency_contact','medical',
    'travel_authorization','driver_form','code_of_conduct',
    'league_eligibility','university_recreation'
  )),
  status waiver_status DEFAULT 'missing',
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, member_id, waiver_type)
);
CREATE INDEX idx_sports_waivers_org ON sports_waivers(org_id, status);

CREATE TABLE sports_injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  incident_date DATE NOT NULL,
  context TEXT NOT NULL CHECK (context IN ('practice','game','tournament','other')),
  body_area TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minor','moderate','severe','critical')),
  description TEXT NOT NULL,
  action_taken TEXT,
  trainer_referred BOOLEAN DEFAULT false,
  return_to_play_date DATE,
  is_cleared BOOLEAN DEFAULT false,
  emergency_contact_notified BOOLEAN DEFAULT false,
  document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sports_injuries_org ON sports_injuries(org_id, is_cleared);

CREATE TABLE sports_travel_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  total_cost NUMERIC(12,2),
  cost_per_player NUMERIC(12,2),
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning','confirmed','in_progress','completed','cancelled')),
  itinerary TEXT,
  packing_list TEXT,
  meal_plan TEXT,
  emergency_contacts JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_sports_travel_org ON sports_travel_trips(org_id, departure_date);

CREATE TABLE sports_trip_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES sports_travel_trips(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12,2) NOT NULL,
  subsidy NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE sports_travel_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES sports_travel_trips(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  hotel_assignment TEXT,
  carpool_assignment TEXT,
  is_driver BOOLEAN DEFAULT false,
  driver_form_completed BOOLEAN DEFAULT false,
  payment_status payment_status DEFAULT 'pending',
  confirmed BOOLEAN DEFAULT false,
  UNIQUE (trip_id, member_id)
);

CREATE TABLE sports_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'equipment',
  quantity_total INT DEFAULT 1,
  quantity_available INT DEFAULT 1,
  storage_location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sports_equipment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES sports_equipment(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES member_profiles(id) ON DELETE CASCADE,
  jersey_number TEXT,
  uniform_size TEXT,
  issued_at TIMESTAMPTZ DEFAULT now(),
  returned_at TIMESTAMPTZ,
  condition TEXT DEFAULT 'good' CHECK (condition IN ('new','good','fair','damaged','lost')),
  notes TEXT
);

-- ============================================================
-- OFFICER TRANSITION BINDERS
-- ============================================================
CREATE TABLE transition_binders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  outgoing_officer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  outgoing_name TEXT,
  semester TEXT,
  year INT,
  responsibilities TEXT,
  key_deadlines JSONB DEFAULT '[]',
  key_contacts JSONB DEFAULT '[]',
  vendor_notes TEXT,
  budget_notes TEXT,
  lessons_learned TEXT,
  unfinished_tasks TEXT,
  recommendations TEXT,
  document_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MESSAGES (for interchapter comms)
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT,
  thread_id UUID,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  recipient_org_id UUID REFERENCES organizations(id),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_messages_org ON messages(org_id, sent_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnm_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnm_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE standards_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE nme_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumni_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE philanthropy_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE interchapter_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE interchapter_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE housing_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_tryouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_travel_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE transition_binders ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user a member of this org?
CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND status NOT IN ('removed','pending_invite')
  );
$$;

-- Helper: what is the current user's role in this org?
CREATE OR REPLACE FUNCTION org_role(p_org_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM org_members
  WHERE org_id = p_org_id AND user_id = auth.uid()
  LIMIT 1;
$$;

-- Helper: is the current user an officer/admin in this org?
CREATE OR REPLACE FUNCTION is_org_officer(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role IN ('owner','president','vice_president','treasurer','secretary',
                   'social_chair','recruitment_chair','risk_manager',
                   'philanthropy_chair','alumni_chair','nme_chair',
                   'standards_chair','pr_chair','advisor',
                   'captain','co_captain','coach','travel_coordinator',
                   'equipment_manager','safety_officer')
  );
$$;

-- Profiles: users see/edit their own
CREATE POLICY "profiles_own" ON profiles FOR ALL
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Organizations: members can see their org
CREATE POLICY "organizations_member_select" ON organizations FOR SELECT
  USING (is_org_member(id) OR privacy = 'public');
CREATE POLICY "organizations_officer_update" ON organizations FOR UPDATE
  USING (is_org_officer(id));

-- Org members: members can see their org's membership
CREATE POLICY "org_members_select" ON org_members FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "org_members_officer_insert" ON org_members FOR INSERT
  WITH CHECK (is_org_officer(org_id));
CREATE POLICY "org_members_officer_update" ON org_members FOR UPDATE
  USING (is_org_officer(org_id));

-- Member profiles: members see, officers edit
CREATE POLICY "member_profiles_select" ON member_profiles FOR SELECT
  USING (is_org_member(org_id));
CREATE POLICY "member_profiles_officer_write" ON member_profiles FOR ALL
  USING (is_org_officer(org_id));
CREATE POLICY "member_profiles_own_update" ON member_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Events: members see, officers manage
CREATE POLICY "events_member_select" ON events FOR SELECT
  USING (is_org_member(org_id) OR (status = 'upcoming' AND is_private = false));
CREATE POLICY "events_officer_write" ON events FOR ALL
  USING (is_org_officer(org_id));

-- Payments: members see own, officers see all
CREATE POLICY "payments_own_select" ON payments FOR SELECT
  USING (is_org_member(org_id) AND (
    is_org_officer(org_id) OR
    EXISTS (SELECT 1 FROM member_profiles mp
            WHERE mp.id = payments.member_id AND mp.user_id = auth.uid())
  ));
CREATE POLICY "payments_officer_write" ON payments FOR ALL
  USING (is_org_officer(org_id));

-- PNM leads: only officers with recruitment role
CREATE POLICY "pnm_leads_officer_only" ON pnm_leads FOR ALL
  USING (is_org_officer(org_id));

-- PNM texts: only officers
CREATE POLICY "pnm_texts_officer_only" ON pnm_texts FOR ALL
  USING (is_org_officer(org_id));

-- Photos: members see approved, officers see all
CREATE POLICY "photos_member_select" ON photos FOR SELECT
  USING (is_org_member(org_id) AND (
    is_org_officer(org_id) OR
    status = 'approved' OR
    uploaded_by = auth.uid()
  ));
CREATE POLICY "photos_member_insert" ON photos FOR INSERT
  WITH CHECK (is_org_member(org_id));
CREATE POLICY "photos_officer_update" ON photos FOR UPDATE
  USING (is_org_officer(org_id));

-- Injury reports: officers only
CREATE POLICY "sports_injuries_officer_only" ON sports_injuries FOR ALL
  USING (is_org_officer(org_id));

-- Standards cases: officers only
CREATE POLICY "standards_cases_officer_only" ON standards_cases FOR ALL
  USING (is_org_officer(org_id));

-- Incident reports: officers only
CREATE POLICY "incident_reports_officer_only" ON incident_reports FOR ALL
  USING (is_org_officer(org_id));

-- All other org-scoped tables: members can select, officers manage
CREATE POLICY "tasks_member_select" ON tasks FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "tasks_member_insert" ON tasks FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "tasks_officer_update" ON tasks FOR UPDATE USING (is_org_officer(org_id) OR assigned_to = auth.uid());
CREATE POLICY "tasks_officer_delete" ON tasks FOR DELETE USING (is_org_officer(org_id));

CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "announcements_officer_write" ON announcements FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "documents_select" ON documents FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "documents_officer_write" ON documents FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "vendors_select" ON vendors FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "vendors_officer_write" ON vendors FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "notifications_own" ON notifications FOR ALL USING (user_id = auth.uid());

CREATE POLICY "audit_logs_officer_select" ON audit_logs FOR SELECT USING (is_org_officer(org_id));
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "alumni_profiles_select" ON alumni_profiles FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "alumni_profiles_officer_write" ON alumni_profiles FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "budgets_select" ON budgets FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "budgets_officer_write" ON budgets FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "reimbursements_select" ON reimbursements FOR SELECT
  USING (is_org_member(org_id) AND (is_org_officer(org_id) OR submitted_by = auth.uid()));
CREATE POLICY "reimbursements_member_insert" ON reimbursements FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "reimbursements_officer_update" ON reimbursements FOR UPDATE USING (is_org_officer(org_id));

CREATE POLICY "sports_waivers_select" ON sports_waivers FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "sports_waivers_officer_write" ON sports_waivers FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "sports_travel_select" ON sports_travel_trips FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "sports_travel_officer_write" ON sports_travel_trips FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "sports_tryouts_officer_only" ON sports_tryouts FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "sports_equipment_select" ON sports_equipment FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "sports_equipment_officer_write" ON sports_equipment FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "photo_albums_select" ON photo_albums FOR SELECT USING (is_org_member(org_id) OR is_public = true);
CREATE POLICY "photo_albums_officer_write" ON photo_albums FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "philanthropy_campaigns_select" ON philanthropy_campaigns FOR SELECT USING (is_org_member(org_id) OR is_active = true);
CREATE POLICY "philanthropy_campaigns_officer_write" ON philanthropy_campaigns FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "interchapter_proposals_select" ON interchapter_proposals FOR SELECT
  USING (is_org_member(proposing_org_id) OR is_org_member(target_org_id));
CREATE POLICY "interchapter_proposals_insert" ON interchapter_proposals FOR INSERT
  WITH CHECK (is_org_officer(proposing_org_id));
CREATE POLICY "interchapter_proposals_update" ON interchapter_proposals FOR UPDATE
  USING (is_org_officer(proposing_org_id) OR is_org_officer(target_org_id));

CREATE POLICY "interchapter_ideas_select" ON interchapter_ideas FOR SELECT USING (true);
CREATE POLICY "interchapter_ideas_officer_write" ON interchapter_ideas FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "messages_select" ON messages FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "messages_officer_insert" ON messages FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "housing_rooms_select" ON housing_rooms FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "housing_rooms_officer_write" ON housing_rooms FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "forms_select" ON forms FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "forms_officer_write" ON forms FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "risk_checklists_select" ON risk_checklists FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "risk_checklists_officer_write" ON risk_checklists FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "nme_modules_select" ON nme_modules FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "nme_modules_officer_write" ON nme_modules FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "transition_binders_officer" ON transition_binders FOR ALL USING (is_org_member(org_id));

CREATE POLICY "social_calendar_select" ON social_calendar FOR SELECT USING (is_org_member(org_id));
CREATE POLICY "social_calendar_officer_write" ON social_calendar FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "sms_templates_officer" ON sms_templates FOR ALL USING (is_org_officer(org_id));

CREATE POLICY "event_rsvps_select" ON event_rsvps FOR SELECT USING (
  EXISTS (SELECT 1 FROM events e WHERE e.id = event_rsvps.event_id AND is_org_member(e.org_id))
);
CREATE POLICY "event_rsvps_member_write" ON event_rsvps FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND is_org_member(e.org_id))
);

CREATE POLICY "event_guests_select" ON event_guests FOR SELECT USING (
  EXISTS (SELECT 1 FROM events e WHERE e.id = event_guests.event_id AND is_org_member(e.org_id))
);
CREATE POLICY "event_guests_member_insert" ON event_guests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND is_org_member(e.org_id))
);

-- ============================================================
-- TRIGGERS for automatic profile creation
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- STORAGE BUCKETS (run via Supabase dashboard or CLI)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);
