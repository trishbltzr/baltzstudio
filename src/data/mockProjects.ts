import type { AuditCategory, AuditPriority, ClientLifecycleStage, GateStatus, Project, ProjectPlan, ProjectWorkflow, Task, TaskAssignee, TaskStatus } from "../types";

function mkTask(id: string, title: string, assignee: TaskAssignee, status: TaskStatus = "not_started", dueDate?: string): Task {
  return { id, title, assignee, status, ...(dueDate ? { dueDate } : {}) };
}

const auditSource = [
  {
    title: "1.1 Content",
    completeCount: 4,
    items: [
      "Familiar words replace technical or system terms",
      "Questions are concise and friendly",
      "Abbreviations and acronyms are explained",
      "CTA buttons are written with page context",
      "Messaging follows the brand tone and voice",
      "Information follows an F or Z scan pattern",
      "Content uses common language that is easy to understand",
    ],
  },
  {
    title: "1.2 Design & Typography",
    completeCount: 18,
    items: [
      "Form intent is communicated",
      "Forms are grouped by intent and context",
      "Tap targets and form spacing work on mobile",
      "Responsive forms are tall enough to click",
      "Empty states and labels are clear and friendly",
      "Text fields are arranged in a clear column",
      "Only required fields are present",
      "Text fields match the expected input length",
      "Placeholders explain what belongs in the field",
      "Complex date and time fields reduce clicks",
      "Long dropdown fields are avoided",
      "Button sizes are consistent",
      "Button hierarchy is clear",
      "Grouped buttons show the selected option",
      "Radio buttons are used for single-select choices",
      "Checkboxes are used only for multi-select choices",
      "Text links are visually different from body copy",
      "Font size and weight vary by content type",
      "Text content is at least 14px",
      "Font styles are limited to three or fewer",
      "Controls and navigation are distinguishable from content",
      "Uppercase text is limited to labels, headers, or acronyms",
      "No more than two font families are used",
      "Paragraph and heading line length stays around 45-75 characters",
      "Capital letters are not overused",
      "Type hierarchy is standardized across pages",
      "Smallest type remains readable",
      "Visual hierarchy leads users to the primary action",
      "Related information is grouped clearly",
      "Alerts follow consistent toast, snackbar, or banner rules",
      "Primary actions differ visually from secondary actions",
      "Form submission confirmation is visually distinct",
      "Meaning is not conveyed only through color",
      "Content controls stand out from background elements",
      "There are no more than three primary colors",
      "Interactive elements follow familiar conventions",
      "Data grouping shows proximity and alignment",
      "Similar information and functions are grouped together",
      "Information sections have enough spacing",
      "Menu child relationships are visually clear",
      "Relevant page information is visible without unnecessary scrolling",
      "Page layout follows an F or Z pattern",
      "Data displays communicate important information clearly",
      "Images do not contain embedded text",
      "Icons reflect the elements they represent",
      "Illustrations are clear and high-resolution",
      "Images are optimized for the target platform",
      "Icon style is consistent",
      "Illustrations and images match the brand idea",
      "Clickable elements have hover states",
      "Slow-loading states show a loader and helpful hint",
    ],
  },
  {
    title: "1.3 Navigation & Structure",
    completeCount: 7,
    items: [
      "Completed actions do not require extra submit or apply steps",
      "Navigation appears in familiar locations for the platform",
      "Current page location is clearly visible",
      "Physical address is displayed where relevant",
      "Support email or phone is easy to access",
      "About page is easy to find",
      "Menu and page terms use conventional names",
      "Navigation is consistent across pages",
      "Future navigation elements have room to grow",
      "Users can move back and forth on any page",
      "Search is visible when search is a major site component",
      "Footer includes secondary links, social links, and a site map",
      "Multi-step workflows show progress clearly",
      "Website navigation matches familiar website patterns",
      "Main navigation stays available outside mobile menu mode",
      "Needed information is visible and pre-populated",
      "Header logo appears on every page and links home",
    ],
  },
  {
    title: "1.4 Accessibility & Compliance",
    completeCount: 12,
    items: [
      "Website works across major browsers",
      "Main text contrast meets AA",
      "Active objects are visually clickable",
      "Inactive objects do not behave as clickable",
      "SSL certificate is valid",
      "Hints help users act instead of over-explaining",
      "Empty states clearly define the needed action",
      "The site helps format currency, country codes, or large numbers",
      "Inactive buttons explain why they are unavailable",
      "Users can skip or restart onboarding",
      "Dangerous actions ask for confirmation and explain consequences",
      "Errors let users restart or return without losing progress",
      "404 and 503 pages tell users what to do next",
      "Alert messages stand out from the page design",
      "Users can refuse cookies",
      "Location detection asks for permission",
      "Contact access asks for permission",
      "Fees are clearly shown with no hidden costs",
      "Complex fields use real-time validation",
      "Text fields are not case-sensitive when applicable",
      "Text fields contain useful default values when applicable",
      "Field names and field text are visually distinct",
      "Buttons stay inactive until required fields are filled",
      "Forms support browser autofill",
      "Field names stay visible after filling",
      "Incorrect data types are blocked where appropriate",
      "Social sign-in is available when expected",
      "Login has a create-account option",
      "Login or sign-in heading is visible",
      "Forgot password is present",
      "Password visibility toggle is available",
      "Browser password generation is supported",
      "Website logo appears on the login page",
      "Remember me appears on login screens when useful",
      "Password requirements are clear before entry",
      "Terms agreement is placed near registration",
      "Password confirmation shows when passwords match",
      "Clickable elements have safe size and spacing",
      "Tab order through forms makes sense",
      "Users can edit their personal information",
      "Help pages allow users to resume where they left off",
      "Account deletion or subscription cancellation is easy to find",
      "FAQ is categorized and searchable",
    ],
  },
  {
    title: "1.5 Mobile Responsiveness",
    completeCount: 5,
    items: [
      "Main body text is 16px or larger",
      "Site responds to horizontal and vertical orientation",
      "Buttons are large enough to select",
      "Clickable elements have enough padding",
      "The correct keyboard opens for each input type",
      "Important elements are reachable with one hand",
      "Phone functions are requested only in context",
      "Gallery photos are swipeable",
      "Text on images is easy to read",
      "Autocorrect is disabled where users enter structured data",
    ],
  },
  {
    title: "1.6 Search Engine Optimization (SEO)",
    completeCount: 8,
    items: [
      "HTTP redirects to HTTPS",
      "www or non-www version redirects consistently",
      "Indexing errors and warnings are reviewed",
      "Indexed page count is checked",
      "Low-value pages are excluded from indexing when needed",
      "Website passes the mobile-friendly test",
      "Mobile and desktop speed results are recorded",
      "PageSpeed issues are listed for action",
      "404 broken-link count is reviewed",
      "Internal broken links are checked",
      "Backlink count is reviewed",
      "Potentially toxic backlinks are flagged",
      "Accessibility errors are documented",
      "Color contrast errors are documented",
      "Accessibility warnings are documented",
      "All pages are linked in navigation",
      "Pages are reachable within three clicks from home",
      "Site organization can be mapped clearly",
      "Sitemap exists",
      "Google Analytics is connected",
      "Recurring site audit tool is set up",
      "Keyword tracking is set up for top keywords",
    ],
  },
];

function auditTaskPriority(index: number, completeCount: number): AuditPriority {
  if (index < completeCount) return "low";
  if (index === completeCount) return "urgent-important";
  return index === completeCount + 1 ? "urgent" : "important";
}

function auditTaskValue(priority: AuditPriority) {
  if (priority === "low") return "Cleared in audit";
  if (priority === "urgent-important") return "Primary fix";
  if (priority === "urgent") return "Needs review";
  return "Needs attention";
}

function resetMilestonesForFreshWorkflow(project: Project): Project["milestones"] {
  return project.milestones.map(milestone => ({
    ...milestone,
    status: milestone.number === 1 ? "active" : "locked",
    phases: milestone.phases.map((phase, phaseIndex) => ({
      ...phase,
      completedAt: undefined,
      tasks: phase.tasks.map((task, taskIndex) => ({
        ...task,
        status: milestone.number === 1 && phaseIndex === 0 && taskIndex === 0 ? "in_progress" as TaskStatus : "not_started" as TaskStatus,
      })),
      gate: phase.gate ? {
        ...phase.gate,
        status: "locked" as GateStatus,
        sentAt: undefined,
        approvedAt: undefined,
        clientFeedback: undefined,
      } : undefined,
    })),
  }));
}

export const SHARED_AUDIT_CATEGORIES: AuditCategory[] = auditSource.map(category => ({
  title: category.title,
  items: category.items.map((label, index) => {
    const priority = auditTaskPriority(index, category.completeCount);
    return { label, value: auditTaskValue(priority), priority };
  }),
}));

export const SHARED_AUDIT_PAGES = [
  { path: "/", label: "Home", checks: 24, issues: 4 },
  { path: "/about", label: "About", checks: 18, issues: 1 },
  { path: "/services", label: "Services", checks: 20, issues: 3 },
  { path: "/contact", label: "Contact", checks: 14, issues: 2 },
  { path: "/faq", label: "FAQ", checks: 12, issues: 0 },
];

function workflowFor(stage: ClientLifecycleStage, overrides: Partial<ProjectWorkflow> = {}): ProjectWorkflow {
  const baseLead = {
    name: "Hazel Nguyen",
    email: "hazel@houseofhazel.co",
    phone: "+1 555 014 1182",
    businessName: "House of Hazel",
    website: "https://houseofhazel.co",
  };

  const byStage: Record<ClientLifecycleStage, ProjectWorkflow> = {
    "cocoon-consult": {
      stage,
      planLabel: "Cocoon Consult",
      planDescription: "Audit-first consult that turns the landing-page lead into a client-safe website diagnosis.",
      sidebarNudgeTitle: "Choose Cocoon Consult",
      sidebarNudgeBody: "Confirm the guided review path, then complete the Wise payment step to unlock the booking link and premium access.",
      nextStepLabel: "Choose Cocoon Consult Premium",
      nextStepDetail: "The audit is ready. Confirm Cocoon Consult Premium and we will send the Wise payment details next. If they do not continue, the account is archived automatically after the follow-up window.",
      lead: baseLead,
      cocoonLink: { status: "completed", sentAt: "Jun 3, 2026" },
      booking: { status: "locked", label: "Booking unlocks after Wise payment is confirmed" },
      payment: { status: "email_sent", label: "Wise payment email sent", amount: "$350", sentAt: "Jun 4, 2026", qrStatus: "sent" },
      dashboardAccess: { kind: "locked", label: "Premium access unlocks after Cocoon Consult Premium is confirmed", status: "locked" },
      guidanceWindow: { label: "24-hour guidance window unlocks after payment", status: "locked" },
      audit: { status: "generated", generatedAt: "Jun 4, 2026", categories: SHARED_AUDIT_CATEGORIES, pages: SHARED_AUDIT_PAGES },
      notifications: [
        { id: "wf-cocoon-link", type: "cocoon_link_sent", actor: "Baltazar Studio", action: "sent", target: "Cocoon Consult link", date: "Jun 3, 2026", clientVisible: true },
        { id: "wf-audit-generated", type: "audit_generated", actor: "Baltazar Studio", action: "generated", target: "Cocoon audit results", date: "Jun 4, 2026", clientVisible: true },
        { id: "wf-wise-sent", type: "wise_payment_sent", actor: "Baltazar Studio", action: "sent", target: "Wise payment email", date: "Jun 4, 2026", clientVisible: true },
      ],
    },
    "paid-cocoon": {
      stage,
      planLabel: "Cocoon Consult",
      planDescription: "Guided audit call, three-month dashboard access, and a 24-hour guidance window.",
      sidebarNudgeTitle: "Turn the audit into a build",
      sidebarNudgeBody: "Use the Cocoon findings to move into Winged in a Week when you are ready for implementation.",
      nextStepLabel: "Book guided Cocoon Consult call",
      nextStepDetail: "Wise payment is confirmed. Booking, three-month dashboard access, and 24-hour guidance are active.",
      lead: baseLead,
      cocoonLink: { status: "completed", sentAt: "Jun 3, 2026" },
      booking: { status: "available", label: "Guided Cocoon Consult call available" },
      payment: { status: "confirmed", label: "Wise payment confirmed", amount: "$350", sentAt: "Jun 4, 2026", confirmedAt: "Jun 5, 2026", qrStatus: "confirmed" },
      dashboardAccess: { kind: "three_month", label: "Three-month Cocoon dashboard access", startsAt: "Jun 5, 2026", endsAt: "Sep 5, 2026", status: "active" },
      guidanceWindow: { label: "24-hour guidance window", startsAt: "Jun 5, 2026 10:00 AM", endsAt: "Jun 6, 2026 10:00 AM", status: "active" },
      audit: { status: "reviewed", generatedAt: "Jun 4, 2026", reviewedAt: "Jun 5, 2026", categories: SHARED_AUDIT_CATEGORIES, pages: SHARED_AUDIT_PAGES },
      notifications: [
        { id: "wf-wise-confirmed", type: "wise_payment_confirmed", actor: "Baltazar Studio", action: "confirmed", target: "Wise payment", date: "Jun 5, 2026", clientVisible: true },
        { id: "wf-booking-unlocked", type: "booking_unlocked", actor: "Baltazar Studio", action: "unlocked", target: "Guided Cocoon Consult call booking", date: "Jun 5, 2026", clientVisible: true },
        { id: "wf-access-active", type: "access_updated", actor: "Baltazar Studio", action: "opened", target: "Three-month dashboard access", date: "Jun 5, 2026", clientVisible: true },
      ],
    },
    "wiaw-active": {
      stage,
      planLabel: "Winged in a Week",
      planDescription: "Full website build and launch using the Cocoon audit as the strategy foundation.",
      sidebarNudgeTitle: "Protect the launch after handoff",
      sidebarNudgeBody: "In Full Flight keeps the site healthy, current, and useful after Winged in a Week.",
      nextStepLabel: "Approve current build step",
      nextStepDetail: "WIAW is active. Dashboard access is unlimited while working with Baltazar Studio.",
      lead: baseLead,
      cocoonLink: { status: "completed", sentAt: "Jun 3, 2026" },
      booking: { status: "completed", label: "Guided Cocoon Consult call complete", scheduledAt: "Jun 6, 2026 11:00 AM" },
      payment: { status: "confirmed", label: "WIAW project payment confirmed", amount: "$4,500", confirmedAt: "Jun 7, 2026", qrStatus: "confirmed" },
      dashboardAccess: { kind: "unlimited", label: "Unlimited dashboard access while WIAW is active", startsAt: "Jun 7, 2026", status: "active" },
      guidanceWindow: { label: "Studio collaboration access", status: "unlimited" },
      audit: { status: "reviewed", generatedAt: "Jun 4, 2026", reviewedAt: "Jun 6, 2026", categories: SHARED_AUDIT_CATEGORIES, pages: SHARED_AUDIT_PAGES },
      notifications: [
        { id: "wf-wiaw-unlocked", type: "wiaw_unlocked", actor: "Baltazar Studio", action: "opened", target: "Winged in a Week workspace", date: "Jun 7, 2026", clientVisible: true },
        { id: "wf-access-unlimited", type: "access_updated", actor: "Baltazar Studio", action: "updated", target: "Unlimited WIAW dashboard access", date: "Jun 7, 2026", clientVisible: true },
      ],
    },
    "in-full-flight": {
      stage,
      planLabel: "In Full Flight",
      planDescription: "Ongoing support, content updates, optimization, and post-launch momentum after WIAW.",
      sidebarNudgeTitle: "Post-launch support is active",
      sidebarNudgeBody: "Keep requests, priorities, and optimization notes in one continued support workspace.",
      nextStepLabel: "Send support request",
      nextStepDetail: "WIAW is complete. In Full Flight keeps maintenance, content, and optimization moving.",
      lead: baseLead,
      cocoonLink: { status: "completed", sentAt: "Jun 3, 2026" },
      booking: { status: "completed", label: "Launch handoff complete", scheduledAt: "Jun 14, 2026" },
      payment: { status: "confirmed", label: "In Full Flight confirmed", amount: "$1,200/mo", confirmedAt: "Jun 15, 2026", qrStatus: "confirmed" },
      dashboardAccess: { kind: "unlimited", label: "Ongoing support dashboard access", startsAt: "Jun 15, 2026", status: "active" },
      guidanceWindow: { label: "Ongoing support access", status: "unlimited" },
      audit: { status: "reviewed", generatedAt: "Jun 4, 2026", reviewedAt: "Jun 6, 2026", categories: SHARED_AUDIT_CATEGORIES, pages: SHARED_AUDIT_PAGES },
      notifications: [
        { id: "wf-iff", type: "in_full_flight", actor: "Baltazar Studio", action: "opened", target: "In Full Flight workspace", date: "Jun 15, 2026", clientVisible: true },
      ],
    },
    deleted: {
      stage,
      planLabel: "Dashboard Deleted",
      planDescription: "The previous Cocoon audit and dashboard access expired after no continuation. A new Cocoon Consult is required before restarting.",
      sidebarNudgeTitle: "New consult required",
      sidebarNudgeBody: "The old audit may no longer be effective. Book a new Cocoon Consult before using it for strategy or build decisions.",
      nextStepLabel: "Book new Cocoon Consult",
      nextStepDetail: "This dashboard was deleted after the no-action window. Restarting requires a new paid Cocoon Consult because the old audit may be stale.",
      lead: baseLead,
      cocoonLink: { status: "completed", sentAt: "Jun 3, 2026" },
      booking: { status: "completed", label: "Guided Cocoon Consult call complete", scheduledAt: "Jun 6, 2026" },
      payment: { status: "confirmed", label: "Cocoon Consult Premium complete", amount: "$350", confirmedAt: "Jun 5, 2026", qrStatus: "confirmed" },
      dashboardAccess: { kind: "deleted", label: "Dashboard deleted after no-action window", startsAt: "Jun 5, 2026", endsAt: "Sep 5, 2026", status: "deleted" },
      guidanceWindow: { label: "24-hour guidance window complete", startsAt: "Jun 5, 2026 10:00 AM", endsAt: "Jun 6, 2026 10:00 AM", status: "expired" },
      audit: { status: "stale", generatedAt: "Jun 4, 2026", reviewedAt: "Jun 6, 2026", categories: SHARED_AUDIT_CATEGORIES, pages: SHARED_AUDIT_PAGES },
      notifications: [
        { id: "wf-dashboard-deleted", type: "dashboard_deleted", actor: "Baltazar Studio", action: "deleted", target: "Expired dashboard access", date: "Sep 5, 2026", clientVisible: true },
      ],
    },
  };

  return { ...byStage[stage], ...overrides };
}

function cloneData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function workflowLeadForProject(project: Project): ProjectWorkflow["lead"] {
  return {
    name: project.workflow?.lead.name ?? project.clientName,
    email: project.clientEmail,
    phone: project.workflow?.lead.phone ?? "",
    businessName: project.clientName,
    website: project.workflow?.lead.website ?? "",
  };
}

function planForStage(stage: ClientLifecycleStage): ProjectPlan {
  const plans: Record<ClientLifecycleStage, ProjectPlan> = {
    "cocoon-consult": {
      name: "Cocoon Consult",
      description: "Audit-first consult before the guided call and dashboard unlock.",
      status: "active",
      invoices: [],
    },
    "paid-cocoon": {
      name: "Cocoon Consult",
      description: "Guided audit call, three-month dashboard access, and a 24-hour guidance window.",
      status: "active",
      invoices: [],
    },
    "wiaw-active": {
      name: "Winged in a Week",
      description: "Full website build and launch using the Cocoon audit as the strategy foundation.",
      status: "active",
      invoices: [{ label: "WIAW project payment", amount: "$4,500", date: "Jun 7, 2026", paid: true }],
    },
    "in-full-flight": {
      name: "In Full Flight",
      description: "Ongoing post-launch support, optimization, and content maintenance.",
      status: "active",
      invoices: [{ label: "Monthly support", amount: "$1,200", date: "Jun 15, 2026", paid: true }],
    },
    deleted: {
      name: "Dashboard Deleted",
      description: "Deleted dashboard after no continuation during the access window.",
      status: "completed",
      invoices: [],
    },
  };

  return cloneData(plans[stage]);
}

export const INITIAL_PROJECT: Project = {
  id: "house-of-hazel",
  clientName: "House of Hazel",
  clientEmail: "hazel@houseofhazel.co",
  clientInitials: "HH",
  status: "active",
  startDate: "Jun 3, 2025",
  platform: "Webflow",
  notes: [
    { id: "n1", content: "Expert call completed Jun 2. Client is confident in the rose + cream direction. Non-negotiable: the brand name must appear in a script-style font somewhere in the hero. Tone: warm, aspirational, never corporate.", author: "Trisha", date: "Jun 2, 2025" },
    { id: "n2", content: "Copy audit found that the client undersells the transformation. Hero line needs to lead with the outcome, not the service. Will regenerate after the design lock.", author: "Trisha", date: "Jun 4, 2025" },
  ],
  assets: [
    { id: "a1", name: "House of Hazel — Primary Logo.svg", category: "Brand Assets", size: "48 KB", uploadedAt: "Jun 3, 2025", sharedWithClient: false, version: "v1", status: "internal", source: "client" },
    { id: "a2", name: "Brand Style Guide v1.pdf", category: "Brand Assets", size: "2.1 MB", uploadedAt: "Jun 3, 2025", sharedWithClient: false, version: "v1", status: "draft", source: "studio" },
    { id: "a3", name: "Homepage Copy — Final Draft.docx", category: "Copy", size: "34 KB", uploadedAt: "Jun 4, 2025", sharedWithClient: true, version: "v2", status: "shared", source: "studio" },
    { id: "a4", name: "Design System — Webflow.zip", category: "Design", size: "18.4 MB", uploadedAt: "Jun 5, 2025", sharedWithClient: false, version: "v1", status: "internal", source: "studio" },
    { id: "a5", name: "Design Preview — All Pages.pdf", category: "Deliverables", size: "5.6 MB", uploadedAt: "Jun 5, 2025", sharedWithClient: true, version: "v1", status: "shared", source: "studio" },
    { id: "a6", name: "Product photo selects", category: "Client Uploads", size: "Pending", uploadedAt: "Requested Jun 5, 2025", sharedWithClient: true, version: "Request", status: "requested", source: "client", requestNote: "Needed before QA so the final pages do not launch with placeholders." },
    { id: "a7", name: "DNS access notes.md", category: "Launch Prep", size: "12 KB", uploadedAt: "Jun 5, 2025", sharedWithClient: false, version: "v1", status: "internal", source: "studio" },
  ],
  brand: {
    colors: [
      { id: "c1", name: "Primary",   hex: "#2D2926", usage: "Headlines, CTAs" },
      { id: "c2", name: "Secondary", hex: "#C9A96E", usage: "Accents, highlights" },
      { id: "c3", name: "Neutral",   hex: "#F5F0EA", usage: "Backgrounds" },
      { id: "c4", name: "Support",   hex: "#7C6F64", usage: "Body text, borders" },
    ],
    fonts: [
      { id: "f1", name: "Canela",  style: "Serif",      usage: "Display / Headings" },
      { id: "f2", name: "Söhne",   style: "Sans-serif", usage: "Body / UI" },
      { id: "f3", name: "Courier", style: "Monospace",  usage: "Captions / Labels" },
    ],
    style: "Warm, editorial, minimal. High contrast with a luxe neutral palette. Refined but approachable.",
  },
  plan: {
    name: "Winged in a Week",
    description: "Full Webflow site built and launched in 7 business days. Includes up to 5 pages, CMS setup, and one round of revisions.",
    status: "active",
    renewsAt: "Aug 3, 2025",
    invoices: [
      { label: "Project deposit (50%)", amount: "$2,250", date: "Jun 3, 2025", paid: true },
      { label: "Final balance (50%)", amount: "$2,250", date: "Jul 3, 2025", paid: false },
    ],
  },
  workflow: workflowFor("wiaw-active"),
  milestones: [
    {
      id: "m1", number: 1, title: "Foundation", clientLabel: "Foundation", status: "complete",
      phases: [
        { id: "m1-p1", title: "1.1 Project Setup", completedAt: "Jun 3, 2025", tasks: [
          mkTask("m1-p1-1", "Client provides platform credentials", "client", "complete"),
          mkTask("m1-p1-2", "Client provides domain credentials", "client", "complete"),
          mkTask("m1-p1-3", "Delivers additional brand assets", "client", "complete"),
          mkTask("m1-p1-4", "Confirm platform selection (Webflow)", "human", "complete"),
          mkTask("m1-p1-5", "Confirm domain registrar and DNS", "human", "complete"),
          mkTask("m1-p1-6", "Pull Cocoon Consult™ audit into project", "human", "complete"),
          mkTask("m1-p1-7", "Lock project brief", "human", "complete"),
        ]},
        { id: "m1-p2", title: "1.2 Strategy & Architecture", completedAt: "Jun 4, 2025", tasks: [
          mkTask("m1-p2-1", "Analyse Cocoon Consult™ audit", "AI", "complete"),
          mkTask("m1-p2-2", "Generate site map", "AI", "complete"),
          mkTask("m1-p2-3", "Generate user journey", "AI", "complete"),
          mkTask("m1-p2-4", "Review and approve site map", "human", "complete"),
          mkTask("m1-p2-5", "Define content hierarchy", "human", "complete"),
        ]},
        { id: "m1-p3", title: "1.3 Copy & Story", completedAt: "Jun 4, 2025", tasks: [
          mkTask("m1-p3-1", "Generate homepage copy from audit", "AI", "complete"),
          mkTask("m1-p3-2", "Generate About page copy", "AI", "complete"),
          mkTask("m1-p3-3", "Generate Services copy", "AI", "complete"),
          mkTask("m1-p3-4", "Edit and refine copy", "human", "complete"),
          mkTask("m1-p3-5", "Client review and approve copy", "client", "complete"),
        ]},
      ],
    },
    {
      id: "m2", number: 2, title: "Design & Build", clientLabel: "Design & Build", status: "active",
      phases: [
        { id: "m2-p1", title: "2.1 Design", completedAt: "Jun 5, 2025", tasks: [
          mkTask("m2-p1-1", "Generate visual references & moodboard", "AI", "complete"),
          mkTask("m2-p1-2", "Lock design system (colours, typography, spacing)", "human", "complete"),
          mkTask("m2-p1-3", "Design homepage", "human", "complete"),
          mkTask("m2-p1-4", "Design Services page", "human", "complete"),
          mkTask("m2-p1-5", "Design About page", "human", "complete"),
          mkTask("m2-p1-6", "QA designs at all breakpoints", "human", "complete"),
          mkTask("m2-p1-7", "Prepare design preview link", "human", "complete"),
        ], gate: {
          id: "gate-1", label: "Gate 1 — Design Preview", clientLabel: "Design Preview — Ready for your review",
          message: "Your website designs are ready. Review the preview below and submit your feedback using the form. One round of feedback only. Please respond within 24 hours.",
          deliverableLink: "houseofhazel.webflow.io/preview",
          adminLinks: [{ label: "Markup board", url: "markup.houseofhazel.co/design-preview" }],
          status: "sent", sentAt: "Jun 5, 2025 at 2:14 PM",
        }},
        { id: "m2-p2", title: "2.2 Build", tasks: [
          mkTask("m2-p2-1", "Set up Webflow project & CMS structure", "human", "in_progress", "Jun 6, 2025"),
          mkTask("m2-p2-2", "Build homepage", "human", "not_started", "Jun 7, 2025"),
          mkTask("m2-p2-3", "Build Services page", "human", "not_started", "Jun 8, 2025"),
          mkTask("m2-p2-4", "Build About page", "human", "not_started", "Jun 8, 2025"),
          mkTask("m2-p2-5", "Attach preview link", "human", "not_started", "Jun 9, 2025"),
          mkTask("m2-p2-6", "Attach markup link", "human", "not_started", "Jun 10, 2025"),
        ]},
        { id: "m2-p3", title: "2.3 QA & Polish", tasks: [
          mkTask("m2-p3-1", "Cross-browser QA (Chrome, Safari, Firefox)", "human", "not_started"),
          mkTask("m2-p3-2", "Mobile QA across devices", "human", "not_started"),
          mkTask("m2-p3-3", "Speed optimisation (images, scripts)", "human", "not_started"),
          mkTask("m2-p3-4", "SEO meta setup (titles, descriptions, OG)", "human", "not_started"),
          mkTask("m2-p3-5", "Final copy check against approved draft", "human", "not_started"),
          mkTask("m2-p3-6", "Prepare full site preview link", "human", "not_started"),
        ], gate: {
          id: "gate-2", label: "Gate 2 — Full Site Preview", clientLabel: "Full Site Preview — Ready for your review",
          message: "Your full site is built and polished. Review the live preview below and confirm you're happy for us to proceed to launch.",
          deliverableLink: "houseofhazel.webflow.io", status: "locked",
        }},
      ],
    },
    {
      id: "m3", number: 3, title: "Launch", clientLabel: "Launch", status: "locked",
      phases: [
        { id: "m3-p1", title: "3.1 Launch Prep", tasks: [
          mkTask("m3-p1-1", "DNS configuration & domain connection", "human", "not_started"),
          mkTask("m3-p1-2", "SSL certificate setup", "human", "not_started"),
          mkTask("m3-p1-3", "Final deployment to production", "human", "not_started"),
          mkTask("m3-p1-4", "Test live site across all devices", "human", "not_started"),
          mkTask("m3-p1-5", "Analytics & conversion tracking setup", "human", "not_started"),
        ]},
        { id: "m3-p2", title: "3.2 Handoff", tasks: [
          mkTask("m3-p2-1", "Create CMS training document", "human", "not_started"),
          mkTask("m3-p2-2", "Record site walkthrough video", "human", "not_started"),
          mkTask("m3-p2-3", "Compile full handoff package", "human", "not_started"),
          mkTask("m3-p2-4", "Generate SEO baseline report", "AI", "not_started"),
        ], gate: {
          id: "gate-3", label: "Gate 3 — Site Live + Handoff", clientLabel: "Your site is live — Handoff package ready",
          message: "Your site is live. Please confirm receipt of your handoff package and training materials below.",
          status: "locked",
        }},
      ],
    },
  ],
};

export const HOUSE_COCOON_PROJECT: Project = {
  ...INITIAL_PROJECT,
  id: "house-of-hazel",
  clientName: "House of Hazel",
  clientEmail: "hazel@houseofhazel.co",
  clientInitials: "HH",
  platform: "Webflow",
  startDate: "Jun 4, 2026",
  status: "on_hold",
  notes: [],
  assets: [],
  plan: {
    name: "Cocoon Consult",
    description: "Audit-first consult before the guided call and dashboard unlock.",
    status: "active",
    invoices: [],
  },
  workflow: workflowFor("cocoon-consult", {
    lead: {
      name: "Hazel Nguyen",
      email: "hazel@houseofhazel.co",
      phone: "+1 555 014 1182",
      businessName: "House of Hazel",
      website: "https://houseofhazel.co",
    },
  }),
};

export const SECOND_PROJECT: Project = {
  ...INITIAL_PROJECT,
  id: "flora-cocoon-consult",
  clientName: "Flora & Co.",
  clientEmail: "team@floraandco.com",
  clientInitials: "FC",
  platform: "Squarespace",
  startDate: "Jun 4, 2026",
  status: "on_hold",
  plan: {
    name: "Cocoon Consult",
    description: "Audit-first consult before the guided call and dashboard unlock.",
    status: "active",
    invoices: [],
  },
  workflow: workflowFor("cocoon-consult", {
    lead: {
      name: "Flora Chen",
      email: "team@floraandco.com",
      phone: "+1 555 014 2240",
      businessName: "Flora & Co.",
      website: "https://floraandco.example",
    },
  }),
  notes: [],
  assets: [],
};

export const PAID_COCOON_PROJECT: Project = {
  ...SECOND_PROJECT,
  id: "flora-paid-cocoon",
  clientName: SECOND_PROJECT.clientName,
  clientEmail: SECOND_PROJECT.clientEmail,
  clientInitials: SECOND_PROJECT.clientInitials,
  platform: SECOND_PROJECT.platform,
  startDate: "Jun 5, 2026",
  status: "active",
  plan: {
    name: "Cocoon Consult",
    description: "Guided audit call, three-month dashboard access, and a 24-hour guidance window.",
    status: "active",
    invoices: [],
  },
  workflow: workflowFor("paid-cocoon", {
    lead: {
      name: "Flora Chen",
      email: SECOND_PROJECT.clientEmail,
      phone: "+1 555 014 2240",
      businessName: SECOND_PROJECT.clientName,
      website: "https://floraandco.example",
    },
  }),
};

export const WIAW_PROJECT: Project = {
  ...INITIAL_PROJECT,
  id: "flora-wiaw-active",
  clientName: SECOND_PROJECT.clientName,
  clientEmail: SECOND_PROJECT.clientEmail,
  clientInitials: SECOND_PROJECT.clientInitials,
  platform: SECOND_PROJECT.platform,
  startDate: "Jun 7, 2026",
  status: "active",
  notes: [
    { id: "flora-wiaw-note-1", content: "WIAW starts as its own build workflow after Cocoon Consult. Do not carry completed Cocoon audit tasks into the build milestones.", author: "Trisha", date: "Jun 7, 2026" },
    { id: "flora-wiaw-note-2", content: "Use the Cocoon findings as strategy input only. Foundation, design, build, QA, launch, and handoff should progress inside the WIAW workflow.", author: "Trisha", date: "Jun 7, 2026" },
  ],
  assets: SECOND_PROJECT.assets,
  plan: {
    name: "Winged in a Week",
    description: "Full website build and launch using the Cocoon audit as the strategy foundation.",
    status: "active",
    invoices: [{ label: "WIAW project payment", amount: "$4,500", date: "Jun 7, 2026", paid: true }],
  },
  workflow: workflowFor("wiaw-active", {
    lead: {
      name: "Flora Chen",
      email: SECOND_PROJECT.clientEmail,
      phone: "+1 555 014 2240",
      businessName: SECOND_PROJECT.clientName,
      website: "https://floraandco.example",
    },
  }),
  milestones: resetMilestonesForFreshWorkflow(INITIAL_PROJECT),
};

export const IN_FULL_FLIGHT_PROJECT: Project = {
  ...INITIAL_PROJECT,
  id: "flora-in-full-flight",
  clientName: SECOND_PROJECT.clientName,
  clientEmail: SECOND_PROJECT.clientEmail,
  clientInitials: SECOND_PROJECT.clientInitials,
  platform: SECOND_PROJECT.platform,
  startDate: "Jun 15, 2026",
  status: "active",
  plan: {
    name: "In Full Flight",
    description: "Ongoing post-launch support, optimization, and content maintenance.",
    status: "active",
    invoices: [{ label: "Monthly support", amount: "$1,200", date: "Jun 15, 2026", paid: true }],
  },
  workflow: workflowFor("in-full-flight", {
    lead: {
      name: "Flora Chen",
      email: SECOND_PROJECT.clientEmail,
      phone: "+1 555 014 1182",
      businessName: SECOND_PROJECT.clientName,
      website: "https://floraandco.example",
    },
  }),
  milestones: INITIAL_PROJECT.milestones.map(milestone => {
    if (milestone.number === 1 || milestone.number === 2) {
      return {
        ...milestone,
        status: "complete",
        phases: milestone.phases.map(phase => ({
          ...phase,
          tasks: phase.tasks.map(task => ({ ...task, status: "complete" })),
          gate: phase.gate ? { ...phase.gate, status: "approved", approvedAt: phase.gate.approvedAt ?? "Jun 14, 2026" } : undefined,
        })),
      };
    }
    return {
      ...milestone,
      status: "active",
      phases: milestone.phases.map((phase, phaseIndex) => ({
        ...phase,
        tasks: phase.tasks.map((task, taskIndex) => ({
          ...task,
          status: phaseIndex === 0 && taskIndex === 0 ? "in_progress" : "not_started",
        })),
      })),
    };
  }),
};

export const DELETED_PROJECT: Project = {
  ...SECOND_PROJECT,
  id: SECOND_PROJECT.id,
  clientName: SECOND_PROJECT.clientName,
  clientEmail: SECOND_PROJECT.clientEmail,
  clientInitials: SECOND_PROJECT.clientInitials,
  platform: SECOND_PROJECT.platform,
  startDate: "Jun 3, 2026",
  status: "complete",
  plan: {
    name: "Dashboard Deleted",
    description: "Deleted dashboard after no continuation during the access window.",
    status: "completed",
    invoices: [],
  },
  workflow: workflowFor("deleted", {
    lead: {
      name: "Flora Chen",
      email: SECOND_PROJECT.clientEmail,
      phone: "+1 555 014 2240",
      businessName: SECOND_PROJECT.clientName,
      website: "https://floraandco.example",
    },
  }),
};

export const LIFECYCLE_PROJECTS: Project[] = [
  SECOND_PROJECT,
  HOUSE_COCOON_PROJECT,
];

export const PROJECT_BY_LIFECYCLE: Record<ClientLifecycleStage, Project> = {
  "cocoon-consult": SECOND_PROJECT,
  "paid-cocoon": PAID_COCOON_PROJECT,
  "wiaw-active": WIAW_PROJECT,
  "in-full-flight": IN_FULL_FLIGHT_PROJECT,
  deleted: DELETED_PROJECT,
};

export function applyLifecycleStageToProject(project: Project, stage: ClientLifecycleStage): Project {
  const template = PROJECT_BY_LIFECYCLE[stage];
  const shouldUseTemplateMilestones = stage === "cocoon-consult" || stage === "wiaw-active" || stage === "in-full-flight";

  return {
    ...project,
    status: template.status,
    plan: planForStage(stage),
    workflow: workflowFor(stage, {
      lead: workflowLeadForProject(project),
    }),
    milestones: shouldUseTemplateMilestones
      ? cloneData(template.milestones)
      : cloneData(project.milestones),
  };
}
