// Minimal hand-written types matching the SQL schema.
// When using Supabase codegen, replace with the generated output.

export type OrgType =
  | "fraternity"
  | "sorority"
  | "club_sports"
  | "general_org"
  | "university";

export type MemberStatus =
  | "active"
  | "pending_invite"
  | "inactive"
  | "alumni"
  | "removed"
  | "advisor"
  | "admin"
  | "suspended"
  | "new_member";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "overdue"
  | "failed"
  | "refunded"
  | "waived"
  | "partial";

export type PnmStatus =
  | "lead"
  | "contacted"
  | "invited"
  | "attended"
  | "interested"
  | "high_priority"
  | "bid_discussion"
  | "bid_extended"
  | "accepted"
  | "declined"
  | "removed";

export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type PhotoStatus = "pending" | "approved" | "chapter_only" | "do_not_post" | "flagged" | "removed";
export type ReimbursementStatus = "submitted" | "needs_info" | "approved" | "rejected" | "paid";
export type WaiverStatus = "missing" | "completed" | "expired";

export interface Profile {
  id: string;
  full_name: string;
  preferred_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  notification_email: boolean;
  notification_sms: boolean;
  sidebar_preferences?: Record<string, unknown>;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  campus: string | null;
  council_or_league: string | null;
  contact_email: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  privacy: "public" | "private";
  invite_code: string;
  settings: Record<string, unknown>;
  stripe_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  status: MemberStatus;
  joined_at: string;
}

export interface MemberProfile {
  id: string;
  org_id: string;
  user_id: string | null;
  full_name: string;
  preferred_name: string | null;
  email: string;
  phone: string | null;
  class_year: string | null;
  graduation_year: number | null;
  major: string | null;
  hometown: string | null;
  birthday: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  profile_photo_url: string | null;
  membership_status: MemberStatus;
  role: string;
  committees: string[];
  social_links: Record<string, string>;
  notes: string | null;
  jersey_number: string | null;
  position: string | null;
  uniform_size: string | null;
  is_injured: boolean;
  sports_status?: string;
  payment_status: string;
  attendance_rate: number;
  forms_completed: number;
  forms_required: number;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  org_id: string;
  created_by: string | null;
  title: string;
  type: string;
  description: string | null;
  location: string | null;
  address: string | null;
  starts_at: string;
  ends_at: string | null;
  cover_image_url: string | null;
  theme: string | null;
  dress_code: string | null;
  playlist_url: string | null;
  rsvp_enabled: boolean;
  rsvp_limit: number | null;
  waitlist_enabled: boolean;
  show_guest_list: boolean;
  risk_level: string;
  risk_approved: boolean;
  budget_amount: number | null;
  status: string;
  is_private: boolean;
  alcohol: boolean;
  is_point_opportunity?: boolean;
  point_value?: number | null;
  point_category?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventComment {
  id: string;
  event_id: string;
  org_id: string;
  author_id: string | null;
  author_name: string | null;
  parent_id: string | null;
  body: string;
  created_at: string;
}

export interface EventRsvp {
  id: string;
  event_id: string;
  member_id: string | null;
  user_id: string | null;
  guest_name: string | null;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  org_id: string;
  member_id: string | null;
  payment_item_id: string | null;
  amount: number;
  paid_amount: number;
  status: PaymentStatus;
  due_date: string | null;
  paid_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  method: string;
  notes: string | null;
  receipt_url: string | null;
  parent_pay_token: string | null;
  late_fee: number;
  created_at: string;
  updated_at: string;
  member_profiles?: MemberProfile;
}

export interface PaymentItem {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  category: string;
  amount: number;
  due_date: string | null;
  recurring: boolean;
  created_at: string;
}

export interface Reimbursement {
  id: string;
  org_id: string;
  submitted_by: string | null;
  submitted_by_name: string | null;
  event_id: string | null;
  amount: number;
  category: string;
  description: string;
  receipt_url: string | null;
  status: ReimbursementStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  paid_at?: string | null;
  treasurer_approved_at?: string | null;
  president_approved_at?: string | null;
  approval_threshold?: number | null;
  created_at: string;
}

export interface Budget {
  id: string;
  org_id: string;
  label: string;
  period: string;
  fiscal_year: number | null;
  semester: string | null;
  total_budget: number;
  created_at: string;
  budget_lines?: BudgetLine[];
}

export interface BudgetLine {
  id: string;
  budget_id: string;
  category: string;
  type: "income" | "expense";
  description: string | null;
  budgeted: number;
  actual: number;
}

export type PnmRsvpStatus = "pending" | "going" | "maybe" | "declined";

export interface EventPnmInvite {
  id: string;
  event_id: string;
  org_id: string;
  pnm_id: string;
  invite_token: string | null;
  rsvp_status: PnmRsvpStatus;
  rsvp_at: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  created_at: string;
}

export interface PnmLead {
  id: string;
  org_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  instagram_bio_text?: string | null;
  ai_interest_summary?: string | null;
  profile_enriched_at?: string | null;
  enrichment_consent?: boolean;
  class_year: string | null;
  major: string | null;
  hometown: string | null;
  interests: string[];
  referral_source: string | null;
  active_member_connection: string | null;
  status: PnmStatus;
  tags: string[];
  notes: string | null;
  communication_consent: boolean;
  consent_timestamp: string | null;
  opted_out: boolean;
  campaign: string | null;
  created_at: string;
  updated_at: string;
}

export interface PnmEvaluation {
  id: string;
  pnm_id: string;
  evaluator_id: string | null;
  evaluator_name: string | null;
  character: number | null;
  involvement: number | null;
  leadership_potential: number | null;
  academic_seriousness: number | null;
  mutual_interest: number | null;
  social_fit: number | null;
  risk_concern: number | null;
  comments: string | null;
  is_anonymous: boolean;
  created_at: string;
}

export interface Photo {
  id: string;
  org_id: string;
  album_id: string | null;
  uploaded_by: string | null;
  uploader_name: string | null;
  storage_path: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  status: PhotoStatus;
  approved_by: string | null;
  approved_at: string | null;
  is_instagram_ready: boolean;
  is_officer_only: boolean;
  do_not_post: boolean;
  alcohol_flagged: boolean;
  likes: number;
  created_at: string;
}

export interface PhotoAlbum {
  id: string;
  org_id: string;
  event_id: string | null;
  title: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  public_token: string;
  expires_at: string | null;
  allow_member_upload: boolean;
  created_at: string;
  photos?: Photo[];
}

export interface Task {
  id: string;
  org_id: string;
  created_by: string | null;
  assigned_to: string | null;
  assignee_name: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  event_id: string | null;
  tags: string[];
  is_recurring?: boolean;
  recurrence_rule?: string | null;
  attachment_urls?: string[];
  completed_at: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  org_id: string;
  uploaded_by: string | null;
  uploaded_by_name?: string | null;
  title: string;
  category: string;
  storage_path: string;
  url: string;
  folder_id: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  is_private: boolean;
  created_at: string;
}

export interface Announcement {
  id: string;
  org_id: string;
  author_id: string | null;
  author_name: string | null;
  title: string;
  body: string;
  audience: string[];
  pinned: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  org_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Vendor {
  id: string;
  org_id: string;
  name: string;
  category: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  reliability_rating: number | null;
  would_use_again: boolean | null;
  total_spent: number;
  created_at: string;
}

export interface SportsTryout {
  id: string;
  org_id: string;
  candidate_name: string;
  candidate_email: string | null;
  candidate_phone: string | null;
  position: string | null;
  experience_level: string;
  status: string;
  overall_score: number | null;
  notes: string | null;
  tryout_date: string | null;
  created_at: string;
}

export interface SportsWaiver {
  id: string;
  org_id: string;
  member_id: string;
  waiver_type: string;
  status: WaiverStatus;
  signed_at: string | null;
  expires_at: string | null;
  created_at: string;
  member_profiles?: MemberProfile;
}

export interface SportsTravelTrip {
  id: string;
  org_id: string;
  title: string;
  destination: string | null;
  venue_name?: string | null;
  address?: string | null;
  departure_location?: string | null;
  meeting_point?: string | null;
  event_id: string | null;
  departure_date: string;
  return_date: string;
  total_cost: number | null;
  cost_per_player: number | null;
  status: string;
  itinerary: string | null;
  packing_list?: string | null;
  created_at: string;
}

export interface SportsInjury {
  id: string;
  org_id: string;
  member_id: string;
  incident_date: string;
  context: string;
  body_area: string;
  severity: string;
  description: string;
  action_taken: string | null;
  return_to_play_date: string | null;
  is_cleared: boolean;
  created_at: string;
  member_profiles?: MemberProfile;
}

export interface SportsEquipment {
  id: string;
  org_id: string;
  item_name: string;
  category: string;
  quantity_total: number;
  quantity_available: number;
  storage_location: string | null;
  notes: string | null;
  created_at: string;
}

export interface RiskChecklist {
  id: string;
  org_id: string;
  event_id: string | null;
  alcohol_policy: boolean;
  sober_monitors_assigned: boolean;
  guest_ratio_checked: boolean;
  venue_contract_uploaded: boolean;
  transportation_plan: boolean;
  security_plan: boolean;
  emergency_plan: boolean;
  food_water_plan: boolean;
  risk_score: number | null;
  approved: boolean;
  notes: string | null;
  created_at: string;
}

export interface AlumniProfile {
  id: string;
  org_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  graduation_year: number | null;
  pledge_class: string | null;
  city: string | null;
  state: string | null;
  career_field: string | null;
  employer: string | null;
  giving_history: number;
  mentorship_interest: boolean;
  contact_preference: string | null;
  last_contacted: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhilanthropyCampaign {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  goal_amount: number | null;
  raised_amount: number;
  beneficiary: string | null;
  start_date: string | null;
  end_date: string | null;
  public_page_slug: string | null;
  stripe_payment_link: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TransitionBinder {
  id: string;
  org_id: string;
  role: string;
  outgoing_name: string | null;
  semester: string | null;
  year: number | null;
  responsibilities: string | null;
  lessons_learned: string | null;
  recommendations: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  org_id: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

// Stub for Supabase codegen compatibility
export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
  };
}

export interface GreekMatchProfile {
  id: string;
  user_id: string;
  org_id: string;
  display_name: string;
  age: number | null;
  bio: string | null;
  photos: string[];
  major: string | null;
  graduation_year: number | null;
  interests: string[];
  personality_traits: string[];
  gender: string | null;
  interested_in: string[];
  min_age: number;
  max_age: number;
  same_org_ok: boolean;
  is_active: boolean;
  paused: boolean;
  show_org_name: boolean;
  show_full_name: boolean;
  opted_in_at: string;
  created_at: string;
  updated_at: string;
}

export interface GreekMatchMatch {
  id: string;
  user_a_id: string;
  user_b_id: string;
  matched_at: string;
  user_a_unmatched: boolean;
  user_b_unmatched: boolean;
}

export interface GreekMatchMessage {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}
