-- ============================================================
-- TouseOS – Migration 005: Demo seed data (OPTIONAL)
-- Inserts a demo organization with members, events, payments,
-- PNMs, tasks, and more so the app is explorable immediately.
--
-- Skip this migration for a clean production database.
-- To attach the demo org to your account, after signing up run:
--   INSERT INTO org_members (org_id, user_id, role, status)
--   VALUES ('11111111-1111-1111-1111-111111111111', auth.uid(), 'owner', 'active');
-- ============================================================

DO $$
DECLARE
  demo_org UUID := '11111111-1111-1111-1111-111111111111';
  m1 UUID; m2 UUID; m3 UUID; m4 UUID; m5 UUID; m6 UUID;
  ev1 UUID; ev2 UUID; ev3 UUID;
  item1 UUID;
  album1 UUID;
  budget1 UUID;
BEGIN
  -- Skip if already seeded
  IF EXISTS (SELECT 1 FROM organizations WHERE id = demo_org) THEN
    RAISE NOTICE 'Demo org already exists, skipping seed.';
    RETURN;
  END IF;

  -- Organization
  INSERT INTO organizations (id, name, type, campus, council_or_league, contact_email, privacy, invite_code, primary_color, secondary_color)
  VALUES (demo_org, 'Beta Theta Pi – Alpha Epsilon', 'fraternity', 'State University', 'Interfraternity Council', 'exec@betaae.org', 'private', 'DEMO2025', '#059669', '#065f46');

  -- Members
  INSERT INTO member_profiles (org_id, full_name, preferred_name, email, phone, class_year, graduation_year, major, hometown, membership_status, role, payment_status, attendance_rate, forms_completed, forms_required)
  VALUES
    (demo_org, 'Alex Johnson', 'Alex', 'alex@stateu.edu', '+15125550101', 'Senior', 2026, 'Finance', 'Austin, TX', 'active', 'president', 'current', 95, 5, 5)
  RETURNING id INTO m1;
  INSERT INTO member_profiles (org_id, full_name, preferred_name, email, phone, class_year, graduation_year, major, hometown, membership_status, role, payment_status, attendance_rate, forms_completed, forms_required)
  VALUES
    (demo_org, 'Jordan Rivera', 'Jordan', 'jordan@stateu.edu', '+15125550102', 'Junior', 2027, 'Accounting', 'Dallas, TX', 'active', 'treasurer', 'current', 88, 5, 5)
  RETURNING id INTO m2;
  INSERT INTO member_profiles (org_id, full_name, preferred_name, email, phone, class_year, graduation_year, major, hometown, membership_status, role, payment_status, attendance_rate, forms_completed, forms_required)
  VALUES
    (demo_org, 'Sam Patel', 'Sam', 'sam@stateu.edu', '+15125550103', 'Junior', 2027, 'Marketing', 'Houston, TX', 'active', 'social_chair', 'current', 92, 4, 5)
  RETURNING id INTO m3;
  INSERT INTO member_profiles (org_id, full_name, preferred_name, email, phone, class_year, graduation_year, major, hometown, membership_status, role, payment_status, attendance_rate, forms_completed, forms_required)
  VALUES
    (demo_org, 'Chris Lee', 'Chris', 'chris@stateu.edu', '+15125550104', 'Sophomore', 2028, 'Computer Science', 'San Antonio, TX', 'active', 'recruitment_chair', 'overdue', 78, 3, 5)
  RETURNING id INTO m4;
  INSERT INTO member_profiles (org_id, full_name, preferred_name, email, phone, class_year, graduation_year, major, hometown, membership_status, role, payment_status, attendance_rate, forms_completed, forms_required)
  VALUES
    (demo_org, 'Taylor Brooks', 'Taylor', 'taylor@stateu.edu', '+15125550105', 'Freshman', 2029, 'Biology', 'El Paso, TX', 'new_member', 'general_member', 'current', 100, 5, 5)
  RETURNING id INTO m5;
  INSERT INTO member_profiles (org_id, full_name, preferred_name, email, phone, class_year, graduation_year, major, hometown, membership_status, role, payment_status, attendance_rate, forms_completed, forms_required)
  VALUES
    (demo_org, 'Morgan Davis', 'Morgan', 'morgan@stateu.edu', '+15125550106', 'Senior', 2026, 'Engineering', 'Fort Worth, TX', 'active', 'risk_manager', 'current', 85, 5, 5)
  RETURNING id INTO m6;

  -- Events
  INSERT INTO events (id, org_id, title, type, description, location, starts_at, ends_at, rsvp_enabled, show_guest_list, theme, dress_code, status, risk_level)
  VALUES (gen_random_uuid(), demo_org, 'Spring Formal 2025', 'formal', 'Our annual spring formal at the downtown ballroom. Black tie required.', 'Grand Ballroom Downtown', now() + interval '14 days', now() + interval '14 days 5 hours', true, true, 'Black & Gold Gala', 'Black tie', 'upcoming', 'medium')
  RETURNING id INTO ev1;
  INSERT INTO events (id, org_id, title, type, description, location, starts_at, rsvp_enabled, status, risk_level)
  VALUES (gen_random_uuid(), demo_org, 'Chapter Meeting', 'chapter_meeting', 'Weekly chapter meeting. Attendance required.', 'Chapter House Main Room', now() + interval '3 days', true, 'upcoming', 'low')
  RETURNING id INTO ev2;
  INSERT INTO events (id, org_id, title, type, description, location, starts_at, rsvp_enabled, status, risk_level)
  VALUES (gen_random_uuid(), demo_org, 'Philanthropy 5K', 'philanthropy', 'Annual charity 5K run benefiting the local food bank.', 'Campus Track', now() - interval '10 days', true, 'past', 'low')
  RETURNING id INTO ev3;

  -- Payment item + payments
  INSERT INTO payment_items (id, org_id, title, description, category, amount, due_date)
  VALUES (gen_random_uuid(), demo_org, 'Spring 2025 Chapter Dues', 'Semester chapter dues', 'dues', 450.00, (now() + interval '20 days')::date)
  RETURNING id INTO item1;

  INSERT INTO payments (org_id, member_id, payment_item_id, amount, paid_amount, status, due_date, method)
  VALUES
    (demo_org, m1, item1, 450.00, 450.00, 'paid', (now() + interval '20 days')::date, 'stripe'),
    (demo_org, m2, item1, 450.00, 450.00, 'paid', (now() + interval '20 days')::date, 'stripe'),
    (demo_org, m3, item1, 450.00, 225.00, 'partial', (now() + interval '20 days')::date, 'venmo'),
    (demo_org, m4, item1, 450.00, 0.00, 'overdue', (now() - interval '5 days')::date, 'stripe'),
    (demo_org, m5, item1, 450.00, 0.00, 'pending', (now() + interval '20 days')::date, 'stripe'),
    (demo_org, m6, item1, 450.00, 450.00, 'paid', (now() + interval '20 days')::date, 'stripe');

  -- Announcements (trigger will insert notifications for org_members; none exist yet so no-op)
  INSERT INTO announcements (org_id, author_name, title, body, audience, pinned)
  VALUES
    (demo_org, 'Alex Johnson', 'Spring Formal tickets on sale!', 'Get your Spring Formal tickets now. $75 per person, includes dinner. Pay through the Dues tab.', ARRAY['all'], true),
    (demo_org, 'Jordan Rivera', 'Dues reminder', 'Spring dues are due in 20 days. Please pay on time to avoid late fees.', ARRAY['all'], false);

  -- Tasks
  INSERT INTO tasks (org_id, title, description, status, priority, assignee_name, due_date, tags)
  VALUES
    (demo_org, 'Book formal venue', 'Confirm the downtown ballroom reservation and pay deposit.', 'done', 'high', 'Sam Patel', (now() - interval '5 days')::date, ARRAY['social','formal']),
    (demo_org, 'Order formal favors', 'Order custom koozies and photo props.', 'in_progress', 'medium', 'Sam Patel', (now() + interval '7 days')::date, ARRAY['social']),
    (demo_org, 'Submit risk management form', 'Complete IFC risk form for Spring Formal.', 'todo', 'urgent', 'Morgan Davis', (now() + interval '2 days')::date, ARRAY['risk','formal']),
    (demo_org, 'Collect outstanding dues', 'Follow up with members who have not paid.', 'todo', 'high', 'Jordan Rivera', (now() + interval '5 days')::date, ARRAY['finance']);

  -- PNMs
  INSERT INTO pnm_leads (org_id, full_name, email, phone, class_year, major, hometown, referral_source, status, communication_consent, consent_timestamp, consent_source, tags)
  VALUES
    (demo_org, 'Ben Carter', 'ben.carter@stateu.edu', '+15125550201', 'Freshman', 'Business', 'Plano, TX', 'Alex Johnson', 'high_priority', true, now(), 'interest_form', ARRAY['legacy','athlete']),
    (demo_org, 'Diego Martinez', 'diego.m@stateu.edu', '+15125550202', 'Freshman', 'Engineering', 'Laredo, TX', 'Campus tabling', 'interested', true, now(), 'interest_form', ARRAY['stem']),
    (demo_org, 'Tyler Wong', 'tyler.w@stateu.edu', NULL, 'Sophomore', 'Economics', 'Austin, TX', 'Sam Patel', 'attended', false, NULL, NULL, ARRAY['transfer']),
    (demo_org, 'Marcus Hill', 'marcus.h@stateu.edu', '+15125550204', 'Freshman', 'Kinesiology', 'Houston, TX', 'Instagram', 'contacted', true, now(), 'instagram', ARRAY['athlete']),
    (demo_org, 'Noah Green', 'noah.g@stateu.edu', NULL, 'Freshman', 'Pre-Med', 'Dallas, TX', 'Friend referral', 'lead', false, NULL, NULL, ARRAY[]::text[]);

  -- Photo album
  INSERT INTO photo_albums (id, org_id, event_id, title, description, allow_member_upload)
  VALUES (gen_random_uuid(), demo_org, ev3, 'Philanthropy 5K 2025', 'Photos from our charity 5K run!', true)
  RETURNING id INTO album1;

  -- Budget
  INSERT INTO budgets (id, org_id, label, period, fiscal_year, semester, total_budget, notes)
  VALUES (gen_random_uuid(), demo_org, 'Spring 2025 Chapter Budget', 'semester', 2025, 'spring', 25000.00, 'Approved by exec board.')
  RETURNING id INTO budget1;

  INSERT INTO budget_lines (budget_id, category, type, description, budgeted, actual)
  VALUES
    (budget1, 'Dues income', 'income', 'Semester chapter dues', 18000.00, 12600.00),
    (budget1, 'Event income', 'income', 'Formal ticket sales', 4500.00, 2100.00),
    (budget1, 'Venue expense', 'expense', 'Spring formal venue', 6000.00, 3000.00),
    (budget1, 'National dues', 'expense', 'National HQ dues', 4800.00, 4800.00),
    (budget1, 'Philanthropy', 'expense', '5K event costs', 1500.00, 1350.00),
    (budget1, 'Recruitment', 'expense', 'Rush week budget', 3000.00, 1800.00),
    (budget1, 'Social events', 'expense', 'Mixers and socials', 4000.00, 2200.00);

  -- Reimbursement
  INSERT INTO reimbursements (org_id, submitted_by_name, event_id, amount, category, description, status)
  VALUES
    (demo_org, 'Sam Patel', ev3, 134.50, 'Printing & materials', 'Race bibs and signage for the 5K', 'approved'),
    (demo_org, 'Morgan Davis', ev1, 89.99, 'Security', 'Walkie-talkies for formal security team', 'submitted');

  -- Vendors
  INSERT INTO vendors (org_id, name, category, contact_name, contact_email, contact_phone, reliability_rating, would_use_again, total_spent, notes)
  VALUES
    (demo_org, 'Grand Ballroom Downtown', 'Venue', 'Lisa Chen', 'events@grandballroom.com', '+15125559001', 5, true, 12000.00, 'Great service, books up fast. Reserve 3 months ahead.'),
    (demo_org, 'DJ Mike Productions', 'DJ', 'Mike Torres', 'mike@djmike.com', '+15125559002', 4, true, 2400.00, 'Reliable, good music selection.'),
    (demo_org, 'Campus Catering Co', 'Caterer', 'Sarah Kim', 'orders@campuscatering.com', '+15125559003', 3, true, 5600.00, 'Decent food, can be slow on large orders.');

  -- Alumni
  INSERT INTO alumni_profiles (org_id, full_name, email, graduation_year, pledge_class, city, state, career_field, employer, mentorship_interest, giving_history)
  VALUES
    (demo_org, 'David Sterling', 'dsterling@email.com', 2018, 'Fall 2014', 'New York', 'NY', 'Finance', 'Goldman Sachs', true, 2500.00),
    (demo_org, 'Ryan Cooper', 'rcooper@email.com', 2020, 'Fall 2016', 'San Francisco', 'CA', 'Technology', 'Google', true, 1200.00),
    (demo_org, 'James Wright', 'jwright@email.com', 2015, 'Spring 2012', 'Chicago', 'IL', 'Law', 'Kirkland & Ellis', false, 5000.00);

  -- Philanthropy campaign
  INSERT INTO philanthropy_campaigns (org_id, title, description, goal_amount, raised_amount, beneficiary, start_date, end_date, is_active)
  VALUES
    (demo_org, 'Spring Food Drive', 'Raising money and food for the local food bank through our annual 5K.', 10000.00, 6750.00, 'Central Texas Food Bank', (now() - interval '30 days')::date, (now() + interval '15 days')::date, true);

  RAISE NOTICE 'Demo data seeded successfully. Org ID: %', demo_org;
END $$;
