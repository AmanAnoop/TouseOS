import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileText,
  Images,
  LayoutDashboard,
  Lock,
  Menu,
  MessageSquareText,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  Users,
  X,
} from "lucide-react";
import {
  can,
  getOrganizationData,
  getRole,
  modules,
  mvpPriority,
  organizations,
  type Event,
  type Member,
  type Payment,
  type PnmLead,
  type RoleName,
  type SocialAsset,
} from "./data/platform";
import { downloadCsv, toCsv } from "./lib/csv";
import featureBacklog from "../docs/feature-backlog.md?raw";

type View =
  | "dashboard"
  | "onboarding"
  | "roster"
  | "events"
  | "payments"
  | "pnm"
  | "social"
  | "sports"
  | "admin"
  | "coverage";

const navigation: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "roster", label: "Roster", icon: Users },
  { id: "events", label: "Events", icon: CalendarDays },
  { id: "payments", label: "Dues", icon: BadgeDollarSign },
  { id: "pnm", label: "PNM", icon: MessageSquareText },
  { id: "social", label: "Social", icon: Images },
  { id: "sports", label: "SportsOS", icon: Trophy },
  { id: "admin", label: "Admin", icon: ShieldCheck },
  { id: "coverage", label: "Coverage", icon: FileText },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));

interface BacklogSection {
  id: number;
  title: string;
  body: string[];
  bullets: string[];
}

function parseBacklogSections(markdown: string): BacklogSection[] {
  const sections: BacklogSection[] = [];
  let current: BacklogSection | null = null;

  for (const line of markdown.split("\n")) {
    const heading = line.match(/^##\s+(\d+)\.\s+(.+)$/);
    if (heading) {
      current = {
        id: Number(heading[1]),
        title: heading[2],
        body: [],
        bullets: [],
      };
      sections.push(current);
      continue;
    }

    if (!current || line.startsWith("## ")) {
      continue;
    }

    const bullet = line.match(/^-\s+(.+)$/);
    if (bullet) {
      current.bullets.push(bullet[1]);
      continue;
    }

    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("###")) {
      current.body.push(trimmed);
    }
  }

  return sections;
}

const backlogSections = parseBacklogSections(featureBacklog);

export function App() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(organizations[0].id);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [roleName, setRoleName] = useState<RoleName>("President");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
  }, [darkMode]);

  const data = useMemo(
    () => getOrganizationData(selectedOrganizationId),
    [selectedOrganizationId],
  );
  const role = useMemo(() => getRole(roleName), [roleName]);

  const filteredMembers = useMemo(() => {
    return data.members.filter((member) => {
      const matchesQuery = [member.fullName, member.email, member.major, member.role]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase());
      const matchesStatus = statusFilter === "all" || member.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [data.members, query, statusFilter]);

  const paymentSummary = useMemo(() => {
    const totalExpected = data.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalCollected = data.payments.reduce((sum, payment) => sum + payment.paidAmount, 0);
    const overdue = data.payments.filter((payment) => payment.status === "overdue");
    return {
      totalExpected,
      totalCollected,
      collectionRate: totalExpected ? Math.round((totalCollected / totalExpected) * 100) : 0,
      overdue,
    };
  }, [data.payments]);

  const completionRate = useMemo(() => {
    const required = data.members.reduce((sum, member) => sum + member.formsRequired, 0);
    const complete = data.members.reduce((sum, member) => sum + member.formsComplete, 0);
    return required ? Math.round((complete / required) * 100) : 0;
  }, [data.members]);

  const exportRoster = () => {
    const csv = toCsv(
      filteredMembers.map((member) => ({
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        role: member.role,
        status: member.status,
        paymentStatus: member.paymentStatus,
        attendanceRate: member.attendanceRate,
        forms: `${member.formsComplete}/${member.formsRequired}`,
      })),
      [
        { key: "fullName", label: "Full name" },
        { key: "email", label: "Email" },
        { key: "phone", label: "Phone" },
        { key: "role", label: "Role" },
        { key: "status", label: "Status" },
        { key: "paymentStatus", label: "Payment status" },
        { key: "attendanceRate", label: "Attendance rate" },
        { key: "forms", label: "Forms" },
      ],
    );
    downloadCsv(`${data.organization.name.toLowerCase().replaceAll(" ", "-")}-roster.csv`, csv);
  };

  const visibleNavigation = navigation.filter((item) => {
    if (item.id === "payments") return can(roleName, "view payments");
    if (item.id === "pnm") return can(roleName, "view recruitment/PNMs");
    if (item.id === "social") return can(roleName, "view photos");
    if (item.id === "sports") return data.organization.type === "Club Sports Team";
    if (item.id === "admin") return can(roleName, "manage organization settings");
    return true;
  });

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-mark">TO</div>
          <div>
            <strong>TouseOS</strong>
            <span>Student org operating system</span>
          </div>
          <button className="icon-button mobile-only" type="button" onClick={closeSidebar}>
            <X size={18} />
          </button>
        </div>

        <label className="field-label" htmlFor="organization">
          Workspace
        </label>
        <select
          id="organization"
          className="select"
          value={selectedOrganizationId}
          onChange={(event) => {
            setSelectedOrganizationId(event.target.value);
            setActiveView("dashboard");
            closeSidebar();
          }}
        >
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>

        <label className="field-label" htmlFor="role">
          Acting role
        </label>
        <select
          id="role"
          className="select"
          value={roleName}
          onChange={(event) => setRoleName(event.target.value as RoleName)}
        >
          {[
            "President",
            "Treasurer",
            "Recruitment Chair",
            "Social Chair",
            "Risk Manager",
            "Captain",
            "Travel Coordinator",
            "Advisor",
            "General Member",
            "Owner/Admin",
          ].map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <nav className="nav-list" aria-label="Primary">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${activeView === item.id ? "active" : ""}`}
                onClick={() => {
                  setActiveView(item.id);
                  closeSidebar();
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="permission-card">
          <span className="eyebrow">RBAC preview</span>
          <strong>{role.name}</strong>
          <p>{role.permissions.length} enabled permissions in this workspace.</p>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <button className="icon-button mobile-only" type="button" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="workspace-heading">
            <div className="org-logo" style={{ background: data.organization.color }}>
              {data.organization.logo}
            </div>
            <div>
              <span className="eyebrow">{data.organization.type}</span>
              <h1>{data.organization.name}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="ghost-button" type="button" onClick={() => setActiveView("onboarding")}>
              <Sparkles size={16} />
              Onboarding
            </button>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <button
              className="icon-button"
              type="button"
              aria-label="Toggle color mode"
              onClick={() => setDarkMode((value) => !value)}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {activeView === "dashboard" && (
          <Dashboard
            completionRate={completionRate}
            data={data}
            paymentSummary={paymentSummary}
            roleName={roleName}
            setActiveView={setActiveView}
          />
        )}
        {activeView === "onboarding" && <Onboarding organizationType={data.organization.type} />}
        {activeView === "roster" && (
          <Roster
            members={filteredMembers}
            onExport={exportRoster}
            query={query}
            setQuery={setQuery}
            setStatusFilter={setStatusFilter}
            statusFilter={statusFilter}
          />
        )}
        {activeView === "events" && <Events events={data.events} />}
        {activeView === "payments" && (
          <Payments payments={data.payments} members={data.members} paymentSummary={paymentSummary} />
        )}
        {activeView === "pnm" && <PnmCrm leads={data.pnms} roleName={roleName} />}
        {activeView === "social" && <Social assets={data.socialAssets} />}
        {activeView === "sports" && <Sports data={data} />}
        {activeView === "admin" && <Admin data={data} roleName={roleName} />}
        {activeView === "coverage" && <BacklogCoverage />}
      </main>

      <nav className="bottom-nav" aria-label="Mobile primary">
        {visibleNavigation.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={activeView === item.id ? "active" : ""}
              onClick={() => setActiveView(item.id)}
            >
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function Dashboard({
  completionRate,
  data,
  paymentSummary,
  roleName,
  setActiveView,
}: {
  completionRate: number;
  data: ReturnType<typeof getOrganizationData>;
  paymentSummary: {
    totalExpected: number;
    totalCollected: number;
    collectionRate: number;
    overdue: Payment[];
  };
  roleName: RoleName;
  setActiveView: (view: View) => void;
}) {
  const orgSpecificCards =
    data.organization.type === "Club Sports Team"
      ? [
          ["Travel readiness", `${data.sports?.travelReadiness ?? 0}%`, "Waivers, rooms, drivers, and fees"],
          ["Injured players", `${data.sports?.injuredPlayers ?? 0}`, "Restricted injury data"],
          ["Equipment returned", `${data.sports?.equipmentReturned ?? 0}%`, "Uniform and gear status"],
        ]
      : [
          ["PNM pipeline", `${data.pnms.length}`, "Opted-in leads and relationship owners"],
          ["Photo approvals", `${data.socialAssets.reduce((sum, asset) => sum + asset.needsReview, 0)}`, "Needs PR review"],
          ["Risk checks", `${data.events.filter((event) => event.riskLevel !== "low").length}`, "Events requiring review"],
        ];

  return (
    <section className="content-stack">
      <div className="hero-card">
        <div>
          <span className="eyebrow">Mobile-first command center</span>
          <h2>Run your organization from roster to recap.</h2>
          <p>
            TouseOS combines workspaces, RBAC, member operations, events, dues,
            recruitment, photos, SportsOS, and audit-aware admin workflows.
          </p>
        </div>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={() => setActiveView("events")}>
            <Plus size={16} />
            Create event
          </button>
          <button className="secondary-button" type="button" onClick={() => setActiveView("roster")}>
            <Users size={16} />
            Invite members
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={Users} label="Members" value={String(data.members.length)} detail="Active workspace roster" />
        <StatCard
          icon={BadgeDollarSign}
          label="Collected"
          value={`${paymentSummary.collectionRate}%`}
          detail={`${formatCurrency(paymentSummary.totalCollected)} of ${formatCurrency(paymentSummary.totalExpected)}`}
        />
        <StatCard icon={CalendarDays} label="Upcoming events" value={String(data.events.length)} detail="RSVP-ready" />
        <StatCard icon={ClipboardCheck} label="Forms complete" value={`${completionRate}%`} detail="Compliance snapshot" />
      </div>

      <div className="two-column">
        <Panel title="MVP modules" action="Backlog-driven">
          <div className="module-grid">
            {modules
              .filter((module) => module.mvp)
              .map((module) => {
                const Icon = module.icon;
                const allowed = module.permissions.some((permission) => can(roleName, permission));
                return (
                  <div className="module-card" key={module.id}>
                    <Icon size={20} />
                    <div>
                      <strong>{module.label}</strong>
                      <p>{module.summary}</p>
                    </div>
                    <span className={`mini-pill ${allowed ? "success" : "locked"}`}>
                      {allowed ? "Visible" : "Locked"}
                    </span>
                  </div>
                );
              })}
          </div>
        </Panel>

        <Panel title={`${data.organization.type} focus`} action="Role-aware">
          <div className="stacked-list">
            {orgSpecificCards.map(([label, value, detail]) => (
              <div className="insight-row" key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <p>{detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Upcoming events" action="QR + RSVP ready">
        <div className="card-list">
          {data.events.map((event) => (
            <EventCard event={event} key={event.id} />
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Onboarding({ organizationType }: { organizationType: string }) {
  const steps = [
    ["Create organization", "Profile, campus, colors, logo, privacy, contact email"],
    ["Invite officers", "Assign President, Treasurer, Social, Recruitment, Risk, or SportsOS roles"],
    ["Import roster", "Upload CSV, map member statuses, and verify contact fields"],
    ["Enable modules", "Events, RSVP, dues, photo albums, PNM CRM, forms, and reports"],
    ["Review compliance", "Consent, audit logging, role access, and mobile-first workflows"],
  ];

  return (
    <section className="content-stack">
      <PageHeader
        eyebrow="Guided setup"
        title={`${organizationType} onboarding`}
        description="A launch checklist that turns a blank organization into a configured workspace."
      />
      <div className="timeline-card">
        {steps.map(([title, detail], index) => (
          <div className="timeline-step" key={title}>
            <div className="step-index">{index + 1}</div>
            <div>
              <strong>{title}</strong>
              <p>{detail}</p>
            </div>
          </div>
        ))}
      </div>
      <Panel title="MVP priority queue" action="Sequenced">
        <div className="priority-grid">
          {mvpPriority.map((item, index) => (
            <div key={item} className="priority-item">
              <span>{index + 1}</span>
              {item}
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Roster({
  members,
  onExport,
  query,
  setQuery,
  setStatusFilter,
  statusFilter,
}: {
  members: Member[];
  onExport: () => void;
  query: string;
  setQuery: (value: string) => void;
  setStatusFilter: (value: string) => void;
  statusFilter: string;
}) {
  const statuses = ["all", ...Array.from(new Set(members.map((member) => member.status)))];

  return (
    <section className="content-stack">
      <PageHeader
        eyebrow="Member operations"
        title="Roster directory"
        description="Search, filter, invite, import/export, and monitor payments, attendance, and forms."
      />
      <div className="toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            type="search"
            placeholder="Search members, roles, majors..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <select className="select compact" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button className="secondary-button" type="button">
          <Plus size={16} />
          Import CSV
        </button>
        <button className="secondary-button" type="button" onClick={onExport}>
          <Download size={16} />
          Export CSV
        </button>
      </div>
      <div className="member-grid">
        {members.map((member) => (
          <article className="member-card" key={member.id}>
            <div className="avatar">{member.preferredName.slice(0, 2).toUpperCase()}</div>
            <div className="member-card-main">
              <div className="member-title">
                <div>
                  <strong>{member.fullName}</strong>
                  <span>{member.role}</span>
                </div>
                <Pill label={member.status} tone={member.status === "active" ? "success" : "warning"} />
              </div>
              <p>
                {member.major} · {member.classYear} · {member.hometown}
              </p>
              <div className="meter-row">
                <span>Attendance {member.attendanceRate}%</span>
                <ProgressBar value={member.attendanceRate} />
              </div>
              <div className="member-meta">
                <span>{member.email}</span>
                <span>{member.paymentStatus} dues</span>
                <span>
                  {member.formsComplete}/{member.formsRequired} forms
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Events({ events }: { events: Event[] }) {
  return (
    <section className="content-stack">
      <PageHeader
        eyebrow="RSVP + check-in"
        title="Event operations"
        description="Create event pages with guest lists, budgets, forms, risk checks, QR check-in, and photo albums."
      />
      <div className="card-list">
        {events.map((event) => (
          <EventCard event={event} key={event.id} expanded />
        ))}
      </div>
    </section>
  );
}

function EventCard({ event, expanded = false }: { event: Event; expanded?: boolean }) {
  const rsvpRate = Math.round((event.rsvpCount / event.capacity) * 100);
  return (
    <article className="event-card">
      <div className="event-date">
        <CalendarDays size={18} />
        <strong>{formatDateTime(event.date)}</strong>
      </div>
      <div className="event-body">
        <div>
          <strong>{event.title}</strong>
          <p>
            {event.type} · {event.location}
          </p>
        </div>
        <Pill
          label={`${event.riskLevel} risk`}
          tone={event.riskLevel === "low" ? "success" : event.riskLevel === "medium" ? "warning" : "danger"}
        />
      </div>
      <ProgressBar value={rsvpRate} />
      <div className="event-meta">
        <span>
          {event.rsvpCount}/{event.capacity} RSVPs
        </span>
        <span>{formatCurrency(event.budget)} budget</span>
        <span>{event.requiresForms ? "Forms required" : "No forms required"}</span>
      </div>
      {expanded && (
        <div className="event-actions">
          <button className="primary-button" type="button">
            RSVP page
          </button>
          <button className="secondary-button" type="button">
            QR check-in
          </button>
          <button className="secondary-button" type="button">
            Photo album
          </button>
        </div>
      )}
    </article>
  );
}

function Payments({
  members,
  paymentSummary,
  payments,
}: {
  members: Member[];
  paymentSummary: {
    totalExpected: number;
    totalCollected: number;
    collectionRate: number;
    overdue: Payment[];
  };
  payments: Payment[];
}) {
  const memberName = (memberId: string) =>
    members.find((member) => member.id === memberId)?.fullName ?? "Unknown member";

  return (
    <section className="content-stack">
      <PageHeader
        eyebrow="Treasurer dashboard"
        title="Dues and payments"
        description="Track invoices, partial payments, failed/late payments, payment plans, exports, and Stripe Checkout readiness."
      />
      <div className="stats-grid">
        <StatCard icon={BadgeDollarSign} label="Expected" value={formatCurrency(paymentSummary.totalExpected)} detail="Assigned charges" />
        <StatCard icon={CheckCircle2} label="Collected" value={formatCurrency(paymentSummary.totalCollected)} detail={`${paymentSummary.collectionRate}% collection`} />
        <StatCard icon={AlertTriangle} label="Overdue" value={String(paymentSummary.overdue.length)} detail="Needs reminder" />
      </div>
      <Panel title="Payment ledger" action="Manual + Stripe-ready">
        <div className="table-card">
          {payments.map((payment) => (
            <div className="table-row" key={payment.id}>
              <div>
                <strong>{payment.label}</strong>
                <span>{memberName(payment.memberId)}</span>
              </div>
              <span>{payment.category}</span>
              <span>{formatDate(payment.dueDate)}</span>
              <strong>{formatCurrency(payment.amount)}</strong>
              <Pill label={payment.status} tone={payment.status === "paid" ? "success" : payment.status === "overdue" ? "danger" : "warning"} />
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function PnmCrm({ leads, roleName }: { leads: PnmLead[]; roleName: RoleName }) {
  const canText = can(roleName, "send mass texts");
  return (
    <section className="content-stack">
      <PageHeader
        eyebrow="Consent-based CRM"
        title="PNM recruitment pipeline"
        description="Track opted-in leads, event attendance, relationship owners, evaluations, bid discussions, and compliant texting."
      />
      <div className="notice-card">
        <Lock size={18} />
        <div>
          <strong>Mass texting guardrails</strong>
          <p>
            Only opted-in PNMs can be messaged. STOP opt-outs, quiet hours, rate
            limits, and officer approval are first-class workflow requirements.
          </p>
        </div>
        <Pill label={canText ? "Send enabled" : "Approval needed"} tone={canText ? "success" : "warning"} />
      </div>
      <div className="lead-grid">
        {leads.map((lead) => (
          <article className="lead-card" key={lead.id}>
            <div className="lead-header">
              <div>
                <strong>{lead.name}</strong>
                <span>{lead.source}</span>
              </div>
              <Pill label={lead.status} tone={lead.status === "high priority" ? "success" : "info"} />
            </div>
            <div className="lead-meta">
              <span>{lead.email}</span>
              <span>{lead.instagram ?? "No Instagram provided"}</span>
              <span>Owner: {lead.relationshipOwner}</span>
            </div>
            <div className="score-grid">
              <Score label="Character" value={lead.evaluation.character} />
              <Score label="Involvement" value={lead.evaluation.involvement} />
              <Score label="Leadership" value={lead.evaluation.leadership} />
              <Score label="Interest" value={lead.evaluation.mutualInterest} />
            </div>
            <div className="consent-row">
              <CheckCircle2 size={16} />
              {lead.consent.optedIn ? `Opted in via ${lead.consent.source}` : "Not opted in"}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Social({ assets }: { assets: SocialAsset[] }) {
  return (
    <section className="content-stack">
      <PageHeader
        eyebrow="Touse Social"
        title="Photo approvals and content packs"
        description="Organize event albums, approvals, caption drafts, compliance checks, and Instagram-ready exports."
      />
      <div className="social-grid">
        {assets.map((asset) => (
          <article className="social-card" key={asset.id}>
            <div className="social-preview">
              <Images size={26} />
              <strong>{asset.photos}</strong>
              <span>event photos</span>
            </div>
            <div className="social-body">
              <div className="member-title">
                <div>
                  <strong>{asset.eventTitle}</strong>
                  <span>{asset.approved} approved for posting</span>
                </div>
                <Pill label={`${asset.needsReview} review`} tone="warning" />
              </div>
              <blockquote>{asset.captionDraft}</blockquote>
              <div className="chip-row">
                {asset.compliance.map((item) => (
                  <span className="chip" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Sports({ data }: { data: ReturnType<typeof getOrganizationData> }) {
  if (!data.sports) {
    return (
      <section className="content-stack">
        <PageHeader
          eyebrow="SportsOS"
          title="Switch to a club sports workspace"
          description="SportsOS dashboards are available for club sports organizations."
        />
      </section>
    );
  }

  const items = [
    ["Active players", data.sports.activePlayers, "Roster eligibility"],
    ["Injured players", data.sports.injuredPlayers, "Restricted access"],
    ["Waiver completion", `${data.sports.waiverCompletion}%`, "Forms dashboard"],
    ["Travel readiness", `${data.sports.travelReadiness}%`, "Trip checklist"],
    ["Equipment returned", `${data.sports.equipmentReturned}%`, "Inventory status"],
    ["Unpaid travel fees", formatCurrency(data.sports.unpaidTravelFees), "Payment collection"],
  ];

  return (
    <section className="content-stack">
      <PageHeader
        eyebrow="SportsOS"
        title="Club sports command center"
        description="Roster eligibility, waivers, attendance, injuries, equipment, travel readiness, and tournament costs."
      />
      <div className="sports-grid">
        {items.map(([label, value, detail]) => (
          <div className="sports-card" key={label}>
            <Trophy size={20} />
            <strong>{value}</strong>
            <span>{label}</span>
            <p>{detail}</p>
          </div>
        ))}
      </div>
      <Panel title="Travel readiness checklist" action="Tournament safe">
        <div className="checklist-grid">
          {[
            "Missing waivers",
            "Unpaid travel fees",
            "Unassigned hotel rooms",
            "Missing drivers",
            "Incomplete emergency contacts",
            "Missing roster confirmation",
          ].map((item, index) => (
            <div className="checklist-item" key={item}>
              {index < 2 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              {item}
              <ChevronRight size={16} />
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Admin({ data, roleName }: { data: ReturnType<typeof getOrganizationData>; roleName: RoleName }) {
  return (
    <section className="content-stack">
      <PageHeader
        eyebrow="Admin dashboard"
        title="Organization controls and audit log"
        description="Platform/admin visibility for organization status, usage, feature flags, billing readiness, and sensitive action history."
      />
      <div className="notice-card">
        <ShieldCheck size={18} />
        <div>
          <strong>Current role: {roleName}</strong>
          <p>Admin views should expose only configured data and log sensitive access.</p>
        </div>
      </div>
      <Panel title="Audit trail" action="Sensitive actions">
        <div className="table-card">
          {data.auditLogs.map((log) => (
            <div className="table-row audit-row" key={log.id}>
              <div>
                <strong>{log.action}</strong>
                <span>{log.target}</span>
              </div>
              <span>{log.actor}</span>
              <span>{formatDateTime(log.timestamp)}</span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Workspace profile" action={data.organization.privacy}>
        <div className="profile-grid">
          <Info label="Campus" value={data.organization.campus} />
          <Info label="Council/league" value={data.organization.councilOrLeague} />
          <Info label="Contact" value={data.organization.contactEmail} />
          <Info label="Officers" value={data.organization.officers.join(", ")} />
        </div>
      </Panel>
    </section>
  );
}


function BacklogCoverage() {
  const core = backlogSections.find((section) => section.id === 0);
  const mvp = backlogSections.find((section) => section.id === 66);
  const implementedShell = new Set([0, 1, 2, 3, 4, 5, 6, 9, 11, 12, 13, 30, 45, 57, 58, 62, 63, 65, 66]);

  return (
    <section className="content-stack">
      <PageHeader
        eyebrow="Full requested scope"
        title="Feature coverage matrix"
        description="The runnable app imports the canonical backlog and exposes every numbered TouseOS requirement from core architecture through MVP priority order."
      />

      {core && (
        <div className="hero-card coverage-hero">
          <div>
            <span className="eyebrow">0. Core platform architecture</span>
            <h2>{core.title}</h2>
            <p>
              Multi-tenant organization workspaces, reusable member/event/payment
              components, RBAC, audit logs, CSV import/export, notifications,
              onboarding, admin dashboards, and dark/light mobile UI.
            </p>
          </div>
          <div className="coverage-summary">
            <strong>{backlogSections.length}</strong>
            <span>numbered scope sections</span>
          </div>
        </div>
      )}

      <div className="coverage-grid">
        {backlogSections.map((section) => {
          const state =
            section.id === 66
              ? "Priority roadmap"
              : implementedShell.has(section.id)
                ? "MVP shell included"
                : "Backlog captured";
          return (
            <article className="coverage-card" key={section.id}>
              <div className="coverage-card-header">
                <span className="section-number">{section.id}</span>
                <div>
                  <strong>{section.title}</strong>
                  <Pill
                    label={state}
                    tone={state === "MVP shell included" ? "success" : state === "Priority roadmap" ? "info" : "warning"}
                  />
                </div>
              </div>
              {section.body[0] && <p>{section.body[0]}</p>}
              <ul>
                {section.bullets.slice(0, 7).map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              {section.bullets.length > 7 && (
                <span className="more-count">+{section.bullets.length - 7} more captured</span>
              )}
            </article>
          );
        })}
      </div>

      {mvp && (
        <Panel title="66. MVP priority order" action="Build sequence">
          <div className="priority-grid">
            {mvp.bullets.length > 0
              ? mvp.bullets.map((item, index) => (
                  <div key={item} className="priority-item">
                    <span>{index + 1}</span>
                    {item}
                  </div>
                ))
              : mvpPriority.map((item, index) => (
                  <div key={item} className="priority-item">
                    <span>{index + 1}</span>
                    {item}
                  </div>
                ))}
          </div>
        </Panel>
      )}
    </section>
  );
}

function PageHeader({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="page-header">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function Panel({
  action,
  children,
  title,
}: {
  action?: string;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h3>{title}</h3>
        {action && <span>{action}</span>}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <article className="stat-card">
      <Icon size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function Pill({ label, tone }: { label: string; tone: "success" | "warning" | "danger" | "info" }) {
  return <span className={`pill ${tone}`}>{label}</span>;
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(value, 100));
  return (
    <div className="progress-track" aria-label={`${safeValue}%`}>
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="score-card">
      <span>{label}</span>
      <strong>{value}/5</strong>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
