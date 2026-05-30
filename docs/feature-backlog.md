# TouseOS Feature Backlog

TouseOS is a mobile-first SaaS platform for student organizations, Greek
chapters, club sports teams, and university administrators. This backlog
captures the full product surface, major modules, user workflows, and explicit
safety boundaries for future implementation.

## Product pillars

- Multi-tenant workspaces for different organization types.
- Reusable member, event, payment, document, media, task, report, and
  integration modules.
- Granular role-based access control with audit logging for sensitive actions.
- Mobile-first UX with dark/light mode, bottom navigation, fast RSVP, QR
  check-in, photo upload, dues payment, and quick task completion.
- Compliance-aware workflows for recruitment, texting, risk, standards,
  waivers, injury reporting, and university visibility.
- Social/content tooling that turns events into organized albums, approved
  posts, memories, and recap assets.

## Supported organization types

- Fraternity
- Sorority
- Club sports team
- General student organization
- University/admin organization

Each organization has a unique profile, members, roles and permissions, events,
payments, announcements, documents, media/photos, tasks, reports, integrations,
and organization-specific workspace settings.

## Foundational platform requirements

- Multi-tenant database structure with organization-scoped data access.
- Role-based access control across every sensitive workflow.
- Audit logs for payments, roster edits, permissions, incident reports,
  standards cases, injury data, impersonation, and compliance actions.
- CSV import/export for rosters, payments, PNMs, alumni, vendors, reports, and
  finance data.
- Admin dashboard for platform owners.
- Organization onboarding flow with templates by organization type.
- Notification system across in-app, email, SMS, and future push channels.
- Reusable components for events, payments, members, documents, forms, media,
  reports, and dashboards.

## 1. User accounts and authentication

### Features

- User signup and login.
- Forgot password.
- Email verification.
- Two-factor authentication, future.
- User profile with profile photo, phone number, email, notification
  preferences, connected organizations, and role inside each organization.

### User statuses

- Active
- Pending invite
- Inactive
- Alumni
- Removed
- Advisor
- Admin

## 2. Organization setup

### Features

- Create organization.
- Join organization by invite code.
- Request to join organization.
- Organization profile with name, type, campus/university, council/league,
  logo, colors, officers, contact email, and public/private settings.

### Organization templates

- Fraternity template
- Sorority template
- Club sports template
- General club template

## 3. Roles and permissions

Build granular access control with reusable permission categories.

### Universal roles

- Owner/Admin
- President
- Vice President
- Treasurer
- Secretary
- Social Chair
- Recruitment Chair
- Risk Manager
- Philanthropy Chair
- Alumni Chair
- New Member Educator
- Standards Chair
- PR/Social Media Chair
- Advisor
- General Member
- Alumni/Alumnae
- Parent/Guardian, optional
- University Admin, optional

### SportsOS roles

- Captain
- Co-Captain
- Coach
- Treasurer
- Travel Coordinator
- Equipment Manager
- Safety Officer
- Tryout Coordinator
- Player
- Alumni
- Parent/Guardian
- Campus Recreation Admin

### Permission categories

- View roster
- Edit roster
- View payments
- Manage payments
- View recruitment/PNMs
- Manage recruitment/PNMs
- Send mass texts
- Manage events
- Manage guest lists
- View incident reports
- Manage incident reports
- View photos
- Approve photos for posting
- View standards cases
- Manage standards cases
- View documents
- Manage documents
- View reports
- Manage organization settings

## 4. Member roster

### Features

- Member directory and searchable roster.
- Filters by status, class year, officer role, unpaid dues, and event
  attendance.
- Import members by CSV.
- Export roster.
- Invite members by email/SMS.

### Member profile fields

- Full name
- Preferred name
- Profile photo
- Email
- Phone
- Class year
- Graduation year
- Major
- Hometown
- Birthday, optional
- Emergency contact
- Membership status
- Officer role
- Committees
- Payment status
- Attendance history
- Documents completed
- Social links, optional
- Permission-restricted notes

### Greek statuses

- Active member
- New member
- Inactive member
- Alumni/alumnae
- Officer
- Advisor
- Suspended, restricted

### Sports statuses

- Active player
- Practice squad
- Injured
- Inactive
- Captain
- Officer
- Coach/advisor
- Alumni
- Tryout candidate

## 5. Dashboard

Dashboards are customized by organization type and user role.

### Universal widgets

- Upcoming events
- Unpaid balances
- Payment collection percentage
- Pending reimbursements
- Member count
- Attendance trends
- Tasks due
- Overdue tasks
- Announcements
- Recent photos
- Compliance status
- Forms missing
- Organization health score

### Greek widgets

- PNM pipeline
- Rush event attendance
- Bid list status
- Upcoming mixers
- Philanthropy progress
- Social media approval queue
- Risk checklist status
- New member progress
- Alumni engagement

### Sports widgets

- Upcoming practices
- Upcoming games/tournaments
- Waiver completion
- Travel readiness
- Injured players
- Unpaid travel fees
- Equipment not returned
- Tryout pipeline
- Fundraising progress

## 6. Payments and dues

### Features

- Create dues invoice.
- Create one-time charge.
- Create recurring dues.
- Assign charges to members.
- Payment status tracking.
- Manual payment entry.
- Stripe Checkout integration.
- Stripe Connect, later.
- ACH/card support, if provider supports.
- Payment reminders.
- Late fees.
- Partial payments.
- Payment plans.
- Hardship request form.
- Parent payment links.
- Refunds.
- Failed payment alerts.
- Receipts.
- Payment exports.

### Greek payment categories

- Chapter dues
- National dues
- Social fees
- Formal fees
- Philanthropy tickets
- Merchandise
- Housing charges
- Fines, restricted and optional

### Sports payment categories

- Team dues
- Tournament fees
- Travel deposits
- Hotel payments
- Uniform payments
- Equipment fees
- League fees
- Referee fees
- Fundraising obligations

### Treasurer dashboard

- Total expected
- Total collected
- Unpaid members
- Late members
- Upcoming charges
- Failed payments
- Payment plan members
- Export report

## 7. Budgeting and finance

### Features

- Annual budget.
- Semester budget.
- Event budgets.
- Category budgets.
- Income tracking.
- Expense tracking.
- Budget variance.
- Cash-flow forecast.
- Dues collection forecast.
- Event profit/loss.
- Per-member cost calculator.
- Reimbursement totals.
- Export finance reports.

### Budget categories

- Dues income
- Event income
- Donations
- Merchandise income
- National dues expense
- Venue expense
- Food expense
- Transportation expense
- Security expense
- Hotel expense
- Equipment expense
- Philanthropy expense
- Social expense
- Recruitment expense
- Miscellaneous

## 8. Reimbursements

### Features

- Submit reimbursement request.
- Upload receipt.
- Select category.
- Assign to event/project.
- Treasurer approval.
- President approval over threshold.
- Advisor approval, optional.
- Reimbursement status.
- Comments.
- Rejection reason.
- Export reimbursement report.

### Statuses

- Submitted
- Needs info
- Approved
- Rejected
- Paid

## 9. Events

### Universal event features

- Create event.
- Event title, type, description, date/time, location, and cover image.
- RSVP.
- Waitlist.
- QR check-in.
- Manual check-in.
- Attendance report.
- Event chat.
- Announcement blasts.
- Event budget.
- Required forms.
- Guest list.
- Shared photo album.
- Post-event survey.
- Post-event recap.

### Greek event types

- Chapter meeting
- Recruitment event
- Mixer
- Formal
- Date party
- Brotherhood event
- Sisterhood event
- Philanthropy event
- Service event
- Tailgate
- Alumni event
- New member education
- Standards meeting
- Retreat

### SportsOS event types

- Practice
- Game
- Tournament
- Tryout
- Team meeting
- Fundraiser
- Travel event
- Conditioning session
- Alumni game
- Volunteer event

## 10. Partiful-style event pages

### Features

- Event cover image/video.
- Theme.
- RSVP button.
- Visible guest list toggle.
- Countdown.
- Dress code.
- Outfit inspiration.
- Playlist link.
- Poll questions.
- Event updates.
- Shareable invite link.
- QR code.
- Photo album preview.
- Host/co-host display.
- Sponsor/philanthropy display.

## 11. Communication hub

### Features

- Announcements.
- Group messages.
- Officer-only messages.
- Event-specific messages.
- Committee messages.
- Alumni messages.
- Parent messages, optional.
- Email blasts.
- SMS blasts.
- Push notifications, future.
- Scheduled messages.
- Templates.
- Emergency broadcast.

### Audience segments

- All members
- Officers
- New members
- Unpaid members
- Event attendees
- Event non-attendees
- PNMs
- Alumni/alumnae
- Parents
- Sports travel roster
- Tryout candidates

## 12. PNM recruitment CRM

### Features

- PNM list and profile.
- PNM import.
- PNM interest form.
- Pipeline stages.
- Notes and tags.
- Event attendance.
- Communication history.
- Referral source.
- Relationship to active members.
- Bid list builder.
- PNM evaluation.
- Voting.
- Follow-up reminders.
- Recruitment analytics.

### PNM fields

- Name
- Phone
- Email
- Instagram handle, optional and voluntarily provided
- Class year
- Major
- Hometown
- Interests
- Referral source
- Active member connection
- Status
- Notes
- Event history
- Communication consent

### Pipeline statuses

- Lead
- Contacted
- Invited
- Attended
- Interested
- High priority
- Bid discussion
- Bid extended
- Accepted
- Declined
- Removed

## 13. Consent-based PNM mass texting

Build mass texting only for opted-in PNMs.

### Features

- SMS opt-in form.
- Consent checkbox.
- Consent timestamp.
- Consent source.
- STOP unsubscribe handling.
- HELP support.
- Opt-out list.
- Twilio integration.
- Message templates.
- Scheduled texts.
- Segmented PNM lists.
- Event reminder texts.
- Follow-up texts.
- Delivery status.
- Failed message alerts.
- Rate limits.
- Quiet hours.
- Officer approval for mass send.

### Prohibited behavior

- Blasting random scraped phone numbers.
- Messaging without opt-in.
- Bypassing opt-out.

## 14. Instagram-assisted PNM lead capture

Build safe Instagram lead capture, not scraping.

### Features

- Chapter recruitment link-in-bio page.
- Instagram story tracking links.
- QR code generator.
- Active member referral links.
- PNM interest form.
- Source tracking.
- Campaign tracking.
- Optional Instagram handle field.
- Auto-add opted-in leads to CRM.
- DM template generator.
- Social campaign analytics.

### Prohibited behavior

- Follower scraping.
- Like/comment scraping.
- Auto-DM bots.
- Phone number extraction.
- Unauthorized profile harvesting.
- Instagram ranking system.

## 15. PNM relationship graph

### Features

- Show which active members know each PNM.
- Relationship strength.
- Referral source.
- Shared major.
- Shared hometown.
- Shared club/class.
- Alumni referral.
- Family/sibling connection.
- Roommate/friend connection.
- Assigned follow-up owner.

## 16. PNM voting and evaluation

### Features

- Structured evaluation form.
- Values-based criteria.
- Comments.
- Permission-restricted red flag notes.
- Anonymous voting option.
- Named voting option.
- Bid discussion view.
- Final bid list.
- Voting history.

### Evaluation categories

- Character
- Involvement
- Leadership potential
- Academic seriousness
- Mutual interest
- Social fit
- Risk concern

Avoid appearance-based or discriminatory scoring.

## 17. Sorority-specific features

### Features

- Chapter roster.
- Officer dashboards.
- Points system.
- Required event tracking.
- Study hours.
- Service hours.
- Philanthropy hours.
- Panhellenic recruitment support.
- COB/informal recruitment support.
- Member class tracking.
- Alumnae relations.
- Advisor approvals.
- Standards/judicial workflows.
- Leadership applications.
- Committees.
- New member education.
- Sisterhood events.
- PR/social calendar.
- Ritual/private event scheduling without storing ritual content.

### Sorority PR/social features

- Approved photo albums.
- Instagram carousel builder.
- Caption assistant.
- Story templates.
- Senior spotlight templates.
- Birthday story templates.
- Philanthropy post templates.
- Recruitment post templates.
- Collab post planner.
- Do-not-post list.
- Member photo consent.

## 18. Interchapter executive communication

Possible names:

- ExecLink
- Touse Exchange
- GreekLink
- EventBridge
- Touse Collab

### Features

- Verified executive accounts.
- Chapter profiles.
- Officer directory.
- Fraternity/sorority messaging.
- Event proposal workflow.
- Shared event workspace.
- Shared calendar.
- Idea marketplace.
- Joint task board.
- Joint budget splitter.
- Joint guest list.
- Joint risk checklist.
- Shared documents.
- Shared photo albums.
- Co-host approval workflow.

## 19. Interchapter event proposal workflow

### Features

- Propose event to another chapter.
- Event name.
- Event type.
- Proposed dates.
- Estimated attendance.
- Theme ideas.
- Venue ideas.
- Budget estimate.
- Cost split proposal.
- Transportation needs.
- Alcohol/no alcohol field.
- Risk level.
- Philanthropy beneficiary.
- Required approvals.
- Accept proposal.
- Decline proposal.
- Suggest new date.
- Suggest new budget.
- Assign officers.

## 20. Interchapter idea marketplace

### Features

- Post mixer ideas.
- Post philanthropy ideas.
- Post Greek Week ideas.
- Post service ideas.
- Post tailgate ideas.
- Post study event ideas.
- Post wellness event ideas.
- Upvote ideas.
- Comment on ideas.
- Save ideas.
- Show interested chapters.
- Estimate cost.
- Estimate risk level.
- Convert idea into event proposal.

## 21. Shared event workspace

For co-hosted events.

### Features

- Shared event page.
- Shared chat.
- Shared task list.
- Shared budget.
- Shared guest list.
- Shared risk checklist.
- Shared vendor list.
- Shared documents.
- Shared RSVP tracker.
- Shared photo album.
- Shared social approval queue.
- Post-event report.

## 22. Joint event budget splitter

### Features

- Total event cost.
- Fixed split by organization.
- Split by attendee count.
- Split by percentage.
- Deposit responsibility.
- Vendor payment tracking.
- Reimbursement tracking.
- Post-event settlement.
- Proof of payment upload.
- Export report.

## 23. Risk management

### Greek risk features

- Event risk checklist.
- Event risk score.
- Social event approval.
- Alcohol policy checklist.
- Sober monitor assignments.
- Guest ratio tracking.
- Venue contract upload.
- Transportation plan.
- Security plan.
- Emergency plan.
- Food/water plan.
- Post-event report.

### Incident features

- Incident report form.
- Anonymous report.
- Officer-only report.
- Advisor escalation.
- Evidence upload.
- Timeline log.
- Resolution tracking.
- Standards referral.
- Audit trail.

## 24. Standards and accountability

### Features

- Standards case creation.
- Attendance violation.
- Dues violation.
- Conduct report.
- Meeting scheduling.
- Case notes.
- Sanctions.
- Restorative action plans.
- Appeals.
- Resolution tracking.
- Permission controls.
- Audit logs.

### Restorative actions

- Payment plan
- Service hours
- Apology letter
- Mentorship meeting
- Academic support
- Leadership probation
- Follow-up check-in

## 25. New member education

### Features

- New member roster.
- Education calendar.
- Required modules.
- Attendance tracking.
- Mentor/big assignment.
- Values curriculum.
- Quizzes.
- Check-in surveys.
- Anonymous feedback.
- Document completion.
- Anti-hazing acknowledgement.
- Advisor visibility.
- Completion certificate.

## 26. Big/little matching

### Features

- Interest matching.
- Major/career matching.
- Personality preferences.
- Mentorship style.
- Availability.
- Relationship strength.
- Suggested matches.
- Manual override.
- Family tree, optional.
- Reveal planning tools.

## 27. Philanthropy and fundraising

### Features

- Donation pages.
- Ticket sales.
- Team fundraising.
- Chapter fundraising pages.
- Sponsor packages.
- Donor receipts.
- QR donation links.
- Live leaderboards.
- Volunteer shifts.
- Impact report generator.
- Thank-you emails.
- Alumni donor outreach.
- Parent donor outreach.
- Social media templates.

## 28. Alumni/alumnae CRM

### Features

- Alumni profiles.
- Graduation year.
- Pledge/member class.
- City.
- Career field.
- Employer.
- Giving history.
- Event attendance.
- Mentorship interest.
- Contact preferences.
- Donor segmentation.
- Newsletter builder.
- Event invitations.
- RSVP tracking.
- Donation campaigns.
- Career panels.
- Senior-to-alumni handoff.

## 29. Housing module

### Features

- Resident roster.
- Room assignments.
- Room lottery.
- Rent tracking.
- Deposits.
- Maintenance requests.
- Chore schedule.
- Damage reports.
- Move-in checklist.
- Move-out checklist.
- Parking assignments.
- House rules acknowledgment.
- Vendor contacts.
- Repair history.
- Inventory.
- Utility tracking.
- House corporation dashboard.

## 30. Social/photo module: Touse Social

Core promise: turn events into organized photos, polished Instagram posts,
shared memories, and better chapter engagement.

### Features

- Event photo albums.
- Member uploads.
- Co-host uploads.
- Upload approval queue.
- Favorites/likes.
- Photo comments, optional.
- Download all.
- Approved-for-Instagram folder.
- Private/officer-only folder.
- Public link option.
- Expiration option.
- Report/remove photo.
- Photographer upload link.

## 31. Instagram-ready content pack

### Features

- Select photos from event album.
- Suggest best carousel photos.
- Crop to 4:5.
- Crop to 1:1.
- Crop to 9:16 stories.
- Suggest carousel order.
- Detect duplicates.
- Flag blurry photos.
- Flag risky content for review.
- Generate captions.
- Generate story captions.
- Generate hashtag suggestions.
- Generate tag list.
- Generate collaborator list.
- Export ZIP.
- Create social media checklist.

## 32. Photo approval workflow

### Features

- Social chair review.
- President approval, optional.
- Advisor approval, optional.
- Co-host chapter approval.
- Mark approved for Instagram.
- Mark chapter-only.
- Mark do not post.
- Member takedown request.
- Member consent settings.
- Risk flagging.
- Alcohol visibility flag, future.
- Unsafe content flag, future.

## 33. Social media calendar

### Features

- Post calendar.
- Draft captions.
- Approved photos.
- Scheduled reminders.
- Event recap posts.
- Birthday posts.
- Senior spotlights.
- Philanthropy posts.
- Recruitment posts.
- Alumni posts.
- Sponsor posts.
- Content assignments.
- Manual performance tracking.

## 34. Chapter feed

### Features

- Private chapter feed.
- Announcements.
- Photo drops.
- Birthday posts.
- Senior spotlights.
- Philanthropy updates.
- Recruitment updates.
- Intramural results.
- Brother/sister of the week.
- Alumni shoutouts.
- Officer reminders.
- Polls.
- Memes, optional.

## 35. Member social profiles

### Features

- Profile photo.
- Class year.
- Major.
- Hometown.
- Member class.
- Officer roles.
- Committees.
- Interests.
- Big/little family, optional.
- Event photos.
- Favorite memories.
- Instagram handle, optional.
- Birthday, optional.
- Privacy settings.

## 36. Event memories timeline

### Features

- Semester timeline.
- Events in chronological order.
- Top photos from each event.
- Attendance summary.
- Recap caption.
- Best moments.
- Philanthropy amount raised.
- Downloadable semester recap.

## 37. Event photo prompts

### Features

- Prompt members to upload photos after events.
- Best group photo prompt.
- Best candid prompt.
- Outfit photo prompt.
- Philanthropy moment prompt.
- Senior photo dump prompt.
- Big/little photo prompt.

Avoid drinking/hazing-related prompts.

## 38. Collab post planner

For joint fraternity/sorority posts.

### Features

- Approved photos from both chapters.
- Caption approved by both PR chairs.
- Carousel order.
- Collaborator list.
- Tag list.
- Sponsor tags.
- Philanthropy tags.
- Posting checklist.
- Export content pack.

## 39. Social templates

### Templates

- Mixer recap
- Formal recap
- Philanthropy thank-you
- Sisterhood event
- Brotherhood event
- Recruitment week
- Senior spotlight
- Birthday story
- Big/little reveal
- Bid day
- Game day
- Alumni weekend
- Greek Week
- Fundraiser
- Service project

Each template should include caption format, story layout, carousel structure,
photo checklist, and tag reminders.

## 40. Photo request feature

### Features

- PR chair requests specific photos.
- Members submit photos to request.
- Request horizontal banner photos.
- Request senior photos.
- Request philanthropy action shots.
- Request signage photos.
- Request group photos.
- Request non-alcoholic nationals-safe photos.

## 41. Digital yearbook/scrapbook

### Features

- Auto-generate year recap.
- Best event photos.
- Senior pages.
- Philanthropy highlights.
- Big/little families.
- Awards.
- Exec board recap.
- Alumni messages.
- Downloadable PDF/web page.

## 42. Social asset library

### Features

- Logos.
- Colors.
- Brand guidelines.
- Sponsor logos.
- Philanthropy logos.
- Templates.
- Past captions.
- Headshots.
- Officer photos.
- Recruitment graphics.
- Canva links.

## 43. PR compliance checklist

Before public posting, check:

- Alcohol visible?
- Unsafe behavior visible?
- Nonmembers visible?
- Consent needed?
- Sponsor tagged?
- Philanthropy tagged?
- Co-host approved?
- Caption reviewed?
- National/chapter guidelines followed?

## 44. One-click event recap

### Features

- Top photos.
- Caption options.
- Story slides.
- Thank-you message.
- Attendance stats.
- Photo album link.
- Donor/sponsor shoutouts.
- Post-event survey.
- Internal recap.

## 45. SportsOS club sports dashboard

SportsOS should be its own product experience.

### Dashboard widgets

- Roster count.
- Active players.
- Injured players.
- Upcoming practices.
- Upcoming games/tournaments.
- Dues collection.
- Unpaid travel fees.
- Waiver completion.
- Travel readiness.
- Equipment status.
- Fundraising progress.
- Officer tasks.

## 46. SportsOS tryout management

### Features

- Interest form.
- Tryout registration.
- Candidate profile.
- Position.
- Experience level.
- Availability.
- Prior teams.
- Skill evaluations.
- Captain/coach notes.
- Tryout attendance.
- Invite/cut/waitlist status.
- Automated messages.
- Roster offer tracking.

### Evaluation categories

- Athletic ability
- Position fit
- Experience
- Coachability
- Teamwork
- Availability
- Culture fit

## 47. SportsOS roster and eligibility

### Features

- Active roster.
- Practice squad.
- Travel roster.
- Injured list.
- Eligibility status.
- Dues status.
- Waiver status.
- Emergency contact.
- Position.
- Jersey number.
- Attendance percentage.
- Captain/officer role.

### Eligibility requirements

- Dues paid
- Waiver completed
- League eligibility
- University eligibility
- Attendance minimum
- Travel form completed
- Medical form completed

## 48. SportsOS attendance

### Features

- QR check-in.
- Manual check-in.
- Practice attendance.
- Game attendance.
- Excused absence.
- Late arrival.
- Attendance percentage.
- Eligibility impact.
- Automated reminders.
- Attendance reports.

## 49. SportsOS travel management

### Features

- Trip page.
- Tournament/game info.
- Travel roster.
- Itinerary.
- Hotel assignments.
- Carpool assignments.
- Driver forms.
- Rental van tracking.
- Flight info.
- Bus info.
- Emergency contacts.
- Travel waivers.
- Packing list.
- Meal plan.
- Per-player cost.
- Payment collection.
- Reimbursement tracking.

### Travel readiness score checks

- Missing waivers
- Unpaid travel fees
- Unassigned hotel rooms
- Missing drivers
- Incomplete emergency contacts
- Incomplete itinerary
- Missing roster confirmation

## 50. SportsOS trip cost calculator

### Cost categories

- Gas
- Flights
- Hotels
- Rental vans
- Buses
- Tournament registration
- Referee fees
- Field/court rental
- Food
- Equipment transport
- Trainer/medical costs
- Uniforms
- Emergency reserve

### Outputs

- Total trip cost
- Cost per player
- Subsidy amount
- Fundraising gap
- Amount due per player
- Payment deadline

## 51. SportsOS waivers and compliance

### Forms

- Liability waiver
- Concussion form
- Emergency contact form
- Medical information form
- Travel authorization
- Driver form
- Code of conduct
- League eligibility form
- University recreation form

### Dashboard

- Completed forms
- Missing forms
- Expired forms
- Travel-specific requirements
- Sport-specific requirements

## 52. SportsOS injury reporting

### Features

- Injury report form.
- Date/time/location.
- Practice/game/tournament context.
- Body area.
- Severity.
- Action taken.
- Athletic trainer referral.
- Return-to-play status.
- Restricted activity.
- Emergency contact notified.
- Document upload.
- Incident timeline.

Restrict injury data to authorized roles.

## 53. SportsOS equipment and uniforms

### Features

- Team inventory.
- Issued equipment.
- Return status.
- Damaged items.
- Replacement cost.
- Storage location.
- Vendor history.
- Purchase history.
- Jersey number.
- Uniform size.
- Order status.
- Payment status.
- Distribution status.

## 54. SportsOS league/tournament management

### Features

- Schedule.
- Opponent info.
- Tournament brackets.
- Registration deadlines.
- League fees.
- Referee fees.
- Roster submission.
- Score reporting.
- Result archive.
- Event documents.

## 55. SportsOS fundraising

### Features

- Donation pages.
- Sponsor-a-player campaigns.
- Parent campaigns.
- Alumni campaigns.
- Tournament fundraising.
- Merchandise sales.
- Sponsorship packages.
- Donor receipts.
- Fundraising leaderboard.
- Thank-you emails.
- Impact reports.

## 56. SportsOS coaching/captain tools

### Features

- Lineup planner.
- Position depth chart.
- Availability tracker.
- Practice plan.
- Game notes.
- Player development notes.
- Attendance-based eligibility.
- Captains-only notes.
- Team goals.
- Season review.

## 57. Forms and document signatures

Universal forms system.

### Features

- Form builder.
- Required forms.
- Optional forms.
- Signatures.
- Form status.
- Reminders.
- Document upload.
- Export responses.

### Form types

- Waiver
- Emergency contact
- Code of conduct
- Travel form
- Risk form
- Recruitment interest form
- Reimbursement form
- Hardship request
- Housing form
- Event approval form

## 58. Reports

### Universal reports

- Roster report
- Dues report
- Unpaid balance report
- Attendance report
- Event report
- Budget report
- Reimbursement report
- Compliance report
- Task report
- Semester rewind

### Greek reports

- Recruitment report
- PNM pipeline report
- Bid acceptance report
- New member progress report
- Risk report
- Philanthropy report
- Standards summary
- Alumni engagement report
- Social media recap report

### Sports reports

- Travel readiness report
- Waiver completion report
- Tryout report
- Attendance eligibility report
- Injury report
- Equipment report
- Tournament cost report
- Fundraising report

## 59. Officer transition binder

### Features

- Officer-specific transition notes.
- Recurring responsibilities.
- Deadlines.
- Important contacts.
- Vendor history.
- Budget notes.
- Templates.
- Lessons learned.
- Unfinished tasks.
- Attached documents.
- Next-semester recommendations.
- AI-generated summary, future.

### Officer binder types

- President
- Treasurer
- Social chair
- Recruitment chair
- Risk manager
- Philanthropy chair
- Alumni chair
- New member educator
- Captain
- Travel coordinator
- Equipment manager

## 60. Vendor memory

### Features

- Vendor database.
- Vendor category.
- Contact info.
- Past event/trip used.
- Cost history.
- Contract upload.
- Reliability rating.
- Notes.
- Cancellation policy.
- Insurance requirements.
- Payment history.
- Would-use-again rating.

### Vendor categories

- Venue
- DJ
- Caterer
- Security
- Bus company
- Photographer
- T-shirt vendor
- Hotel
- Rental van
- Uniform vendor
- Equipment vendor
- Field/court rental
- Repair contractor

## 61. AI assistant

Build later or start with a basic version.

### Features

- Generate event plan.
- Generate caption.
- Generate PNM text.
- Summarize meeting notes.
- Generate officer transition binder.
- Answer questions about uploaded docs.
- Generate budget draft.
- Generate philanthropy campaign copy.
- Generate alumni newsletter.
- Recommend follow-ups.
- Summarize semester rewind.

AI must not make final decisions on standards cases, risk approval, discipline,
recruitment acceptance, or injury/medical decisions.

## 62. Notification system

### Channels

- In-app
- Email
- SMS
- Push, future

### Notification types

- Event reminder
- Payment reminder
- PNM follow-up
- Form missing
- Task due
- Reimbursement status
- Photo approval request
- Interchapter event proposal
- Travel readiness alert
- Waiver missing
- Officer handoff reminder

## 63. Admin/super-admin dashboard

For platform owners.

### Features

- View organizations.
- View users.
- Organization status.
- Billing status.
- Support tickets.
- Feature flags.
- Usage analytics.
- SMS usage.
- Payment volume.
- Storage usage.
- Error logs.
- Impersonation with audit log, optional.

## 64. University/admin dashboard, future

### Features

- Organization directory.
- Officer contacts.
- Roster reporting.
- Event registration.
- Compliance status.
- Travel approvals.
- Risk form submissions.
- Incident escalation.
- Funding requests.
- Organization health trends.

Do not expose private chapter/team data unless explicitly configured.

## 65. Mobile-first requirements

Every feature should work well on phone.

### Requirements

- Bottom navigation.
- Fast event RSVP.
- Quick photo upload.
- Quick dues payment.
- QR check-in.
- Easy PNM texting.
- Quick task completion.
- Push-ready architecture.
- Responsive dashboard cards.

## 66. MVP priority order

1. Auth and organizations
2. Roles and permissions
3. Member roster
4. Events and RSVP
5. Photo albums
6. PNM CRM
7. Consent-based PNM texting
8. Basic dues/payment tracking
9. Stripe Checkout
10. Social media approval/content pack
11. Interchapter event proposals
12. Officer transition notes
13. SportsOS roster
14. SportsOS attendance
15. SportsOS waivers
16. SportsOS travel cost calculator
17. Reports
18. Advanced AI

## Cross-cutting implementation notes

- Every entity that belongs to an organization should carry an organization
  scope and be protected by tenant-aware authorization checks.
- Sensitive workflows should emit structured audit log entries with actor,
  organization, target resource, action, timestamp, and relevant metadata.
- SMS workflows must enforce consent, STOP opt-out handling, rate limits, quiet
  hours, and officer approval before mass sends.
- Recruitment and evaluation workflows should avoid appearance-based,
  discriminatory, or unauthorized data collection.
- Sports injury and medical data should be role-restricted and separated from
  general roster visibility.
- University/admin reporting should expose only configured compliance data and
  never private chapter/team records by default.
