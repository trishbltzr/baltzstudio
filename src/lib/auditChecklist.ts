export type AuditCheckStatus = "pass" | "fail" | "unverified" | "not_applicable";

const category = (key: string, label: string, labels: string[]) => ({
  key,
  label,
  checks: labels.map((checkLabel, index) => ({ id: `${key}-${String(index + 1).padStart(2, "0")}`, label: checkLabel })),
});

export const AUDIT_CHECKLIST = [
  category("content", "Content", [
    "Uses familiar words and phrases instead of technical or system terms",
    "Questions referring to users are concise and friendly",
    "Abbreviations and acronyms are explained",
    "Calls to action and buttons are written with context in mind",
    "Messaging follows the brand tone and voice, including error messages",
    "Information follows an F or Z pattern and is easily scannable",
    "Content uses common language and is easy to understand",
  ]),
  category("design", "Design & Typography", [
    "Form intent is communicated",
    "Forms are grouped by intent and context",
    "Form tap targets and spacing are large enough for mobile selection",
    "Responsive form controls are tall enough to click easily",
    "Empty states and labels are clear and friendly",
    "Text fields are arranged in a clear column",
    "Forms contain only the required number of fields",
    "Text fields are sized for the expected input length",
    "Placeholders indicate the expected input",
    "Complex fields such as date and time minimize clicks",
    "Long dropdown fields are avoided",
    "Button sizes are consistent",
    "Button hierarchy is clear",
    "Grouped buttons show which option is selected",
    "Radio buttons are used for single-select choices",
    "Checkboxes are used only for multi-select choices",
    "Text links are visually distinct from body copy",
    "Font size and weight distinguish content types",
    "Text content uses fonts of at least 14px",
    "Each page uses no more than three font styles",
    "Typography distinguishes content from controls and navigation",
    "Uppercase is limited to labels, headers, and acronyms",
    "No more than two font families are used",
    "Paragraph and heading line lengths are approximately 45-75 characters",
    "Capital letters are not overused",
    "Type hierarchy is rhythmic and standardized across pages",
    "Type remains readable at its smallest size",
    "Visual hierarchy leads to the required action or key information",
    "Related information is grouped clearly",
    "Alert messages consistently use appropriate toast, snackbar, or banner patterns",
    "Primary actions differ visually from secondary actions",
    "Form submission confirmation is visually distinct",
    "Meaning is not conveyed through color alone",
    "Content controls stand out from background elements",
    "No more than three primary colors appear on a page",
    "Interactive elements use familiar conventions",
    "Related data and functions use proximity and alignment",
    "Information sections have enough spacing",
    "Menu parent-child relationships are visually clear",
    "Relevant information is visible without excessive scrolling",
    "Page information follows an F or Z pattern",
    "Data displays clearly communicate important information",
    "Images and illustrations do not contain embedded text",
    "Icons clearly represent their associated element",
    "Illustrations are clear, high-resolution, and uncluttered",
    "Images are high quality and optimized for the target platform",
    "The icon set is visually consistent",
    "Illustrations and images feel on-brand and support the intended idea",
    "Clickable elements have a visible hover state",
    "Processes longer than three seconds show a loader or progress hint",
  ]),
  category("navigation", "Navigation & Structure", [
    "Completed actions do not require unnecessary extra submission steps",
    "Navigation appears in a familiar location",
    "The current page is clearly communicated",
    "The company physical address is displayed when applicable",
    "A support email or phone number is easy to find",
    "The About page is easy to access",
    "Menu and page names are user-friendly and conventional",
    "Navigation is consistent across pages",
    "Navigation can accommodate future items",
    "Users can move backward and forward on any page",
    "Search is visible on every page when search is a major site feature",
    "The footer contains secondary links, social links, and a complete sitemap",
    "Multi-step workflows show visible progress and remaining steps",
    "Site navigation follows familiar website conventions",
    "Main desktop navigation is not unnecessarily hidden behind a menu",
    "Needed information is visible and pre-populated at the relevant point",
    "The header logo appears on every page and links to the homepage",
  ]),
  category("accessibility", "Accessibility & Compliance", [
    "The website is compatible with major browsers",
    "Main text meets at least WCAG AA contrast",
    "Active and inactive controls are visually distinguishable",
    "The website uses a valid SSL certificate",
    "Hints help users act instead of merely explaining",
    "Empty states clearly identify the required action",
    "The website formats common data such as currency, phone codes, and large numbers helpfully",
    "Disabled buttons explain why they are unavailable",
    "Users can skip or restart onboarding",
    "Dangerous actions request confirmation and explain consequences",
    "Users can recover from errors without losing progress",
    "404 and 503 pages explain what to do next",
    "Alerts stand out clearly from surrounding content",
    "Users can refuse cookies",
    "Location access is requested only with permission",
    "Contact access is requested only with permission",
    "Prices and fees are shown clearly when the website charges a fee",
    "Forms validate input in real time",
    "Complex fields show errors before final submission",
    "Text fields are case-insensitive where appropriate",
    "Text fields include useful default values where appropriate",
    "Field labels are visually distinct from entered values",
    "Multi-field forms keep submission unavailable until required fields are complete",
    "Forms support browser autofill",
    "Field labels remain visible after fields are filled",
    "Inputs block clearly invalid data types where appropriate",
    "Social sign-in is available where appropriate",
    "Login pages provide a create-account option where appropriate",
    "Login or sign-in pages have a visible heading",
    "Forgot-password access is present on login screens",
    "Password fields provide a visibility toggle",
    "Browser password generation is supported",
    "The website logo appears on the login page",
    "Login pages provide a remember-me option where appropriate",
    "Password requirements appear before password entry",
    "Registration places terms acceptance next to the registration action",
    "Password confirmation shows when passwords match",
    "Clickable elements are sized and spaced to prevent accidental clicks",
    "Users can tab through forms in a logical order",
    "Users can edit their personal information easily",
    "Help opens without causing users to lose their work",
    "Account deletion or subscription cancellation is easy to find",
    "FAQ content is categorized and searchable",
  ]),
  category("mobile", "Mobile Responsiveness", [
    "Main body text is at least 16px on mobile",
    "The site responds correctly in portrait and landscape orientation",
    "Buttons are large enough to select on mobile",
    "Clickable elements have adequate spacing",
    "Input fields open the appropriate mobile keyboard",
    "Important actions are reachable with one hand",
    "Phone features are requested only in context",
    "Gallery images support swipe gestures",
    "Text over images remains readable",
    "Autocorrect is disabled for fields where it would cause errors",
  ]),
  category("seo", "Search Engine Optimization", [
    "HTTP redirects to HTTPS",
    "WWW or non-WWW is used consistently with a redirect",
    "Indexing errors and warnings have been reviewed",
    "Google-indexed page count has been reviewed",
    "Pages that should be excluded from indexing are identified",
    "The website passes mobile-friendly checks",
    "Mobile site-speed results are recorded",
    "Desktop site-speed results are recorded",
    "PageSpeed Insights issues are recorded",
    "404 errors have been checked",
    "Broken internal links have been checked",
    "Backlink quantity has been reviewed",
    "Potentially toxic backlinks have been reviewed",
    "Accessibility errors and warnings have been reviewed",
    "Color contrast errors have been reviewed",
    "All important pages are linked in navigation",
    "Important pages are reachable within three clicks",
    "The site structure can be represented clearly",
    "The website has a sitemap",
    "Google Analytics is configured",
    "A recurring site-audit tool is configured",
    "Keyword position tracking is configured for priority keywords",
  ]),
] as const;

export type AuditChecklistKey = typeof AUDIT_CHECKLIST[number]["key"];
export type AuditSeverity = "critical" | "high" | "medium" | "low";

export const ALL_AUDIT_CHECKS = AUDIT_CHECKLIST.flatMap(group => group.checks);
export const AUDIT_CHECK_BY_ID = new Map(ALL_AUDIT_CHECKS.map(check => [check.id, check]));

export interface AuditCheckResult {
  id: string;
  label: string;
  status: AuditCheckStatus;
  evidence: string;
  sourceUrl: string | null;
}

export interface AuditIssue {
  criterion: string;
  severity: AuditSeverity;
  finding: string;
  evidence: string;
  sourceUrl: string | null;
  fix: string;
}

export interface LighthouseMetric {
  id: string;
  label: string;
  displayValue: string;
  score: number | null;
}

export interface LighthouseInsight {
  id: string;
  title: string;
  description: string;
  displayValue: string | null;
  score: number;
  category: "performance" | "accessibility" | "bestPractices" | "seo";
}

export interface LighthouseRun {
  strategy: "mobile" | "desktop";
  testedUrl: string;
  fetchedAt: string;
  lighthouseVersion: string;
  scores: { performance: number; accessibility: number; bestPractices: number; seo: number };
  metrics: LighthouseMetric[];
  insights: LighthouseInsight[];
}

export interface AuditScoreCategory {
  key: AuditChecklistKey;
  label: string;
  score: number;
  scoreFormula: string;
  target: number;
  passed: number;
  failed: number;
  unverified: number;
  notApplicable: number;
  checks: AuditCheckResult[];
  courseOfAction: string;
  issues: AuditIssue[];
  strengths: string[];
}

export interface AuditScoreResult {
  kind: "audit_score";
  title: string;
  summary: string;
  overallScore: number;
  targetScore: number;
  evidenceCoverage: number;
  verifiedChecks: number;
  applicableChecks: number;
  coverageThreshold: number;
  confidence: "provisional" | "reliable";
  pagesReviewed: string[];
  lighthouse: LighthouseRun[];
  categories: AuditScoreCategory[];
  priorities: Array<{ title: string; why: string; action: string }>;
}

export function specificAuditCourseOfAction(category: Pick<AuditScoreCategory, "label" | "issues" | "checks">) {
  const failedChecks = category.checks.filter(check => check.status === "fail");
  const groundedIssues = category.issues.filter(issue => failedChecks.some(check => check.id === issue.criterion || check.label === issue.criterion));
  const fixes = Array.from(new Set(groundedIssues.map(issue => issue.fix.trim()).filter(Boolean))).slice(0, 3);
  if (fixes.length) return `Implement the verified ${category.label.toLowerCase()} fixes: ${fixes.join(" ")}`;

  const failed = failedChecks.slice(0, 3);
  if (failed.length) return `Correct the verified failures in ${category.label.toLowerCase()}: ${failed.map(check => check.label).join("; ")}.`;

  return `No implementation change is recommended for ${category.label.toLowerCase()} until the audit records a verified failure.`;
}

export function auditPrioritiesFromEvidence(categories: AuditScoreCategory[]): AuditScoreResult["priorities"] {
  const severityOrder: Record<AuditSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const issuePriorities = categories
    .flatMap(category => category.issues.map(issue => ({ category, issue })))
    .filter(({ category, issue }) => category.checks.some(check => check.status === "fail" && (check.id === issue.criterion || check.label === issue.criterion)))
    .sort((a, b) => severityOrder[a.issue.severity] - severityOrder[b.issue.severity] || a.category.score - b.category.score)
    .map(({ category, issue }) => {
      const criterion = category.checks.find(check => check.id === issue.criterion || check.label === issue.criterion);
      return {
        title: `${category.label}: ${criterion?.label || issue.finding}`,
        why: `${issue.finding} Evidence: ${issue.evidence}`,
        action: issue.fix,
      };
    });

  const failedCheckPriorities = categories
    .slice()
    .sort((a, b) => a.score - b.score)
    .flatMap(category => category.checks
      .filter(check => check.status === "fail" && !category.issues.some(issue => issue.criterion === check.id || issue.criterion === check.label))
      .map(check => ({
        title: `${category.label}: ${check.label}`,
        why: `The audit marked this checklist item as failed. Evidence: ${check.evidence}`,
        action: `Update the affected page so it meets this requirement: ${check.label}.`,
      })));

  const seen = new Set<string>();
  return [...issuePriorities, ...failedCheckPriorities].filter(priority => {
    const key = priority.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}

export function scoreChecks(checks: AuditCheckResult[]) {
  const passed = checks.filter(check => check.status === "pass").length;
  const failed = checks.filter(check => check.status === "fail").length;
  const unverified = checks.filter(check => check.status === "unverified").length;
  const notApplicable = checks.filter(check => check.status === "not_applicable").length;
  const scored = passed + failed;
  return { passed, failed, unverified, notApplicable, score: scored ? Math.round((passed / scored) * 100) : 0 };
}

export function isAuditScoreResult(value: unknown): value is AuditScoreResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<AuditScoreResult>;
  return result.kind === "audit_score" && typeof result.title === "string" && typeof result.summary === "string"
    && typeof result.overallScore === "number" && typeof result.targetScore === "number"
    && (result.evidenceCoverage === undefined || typeof result.evidenceCoverage === "number")
    && Array.isArray(result.pagesReviewed) && Array.isArray(result.lighthouse)
    && Array.isArray(result.categories) && result.categories.length === AUDIT_CHECKLIST.length
    && result.categories.every((entry, index) => entry && entry.key === AUDIT_CHECKLIST[index].key && entry.label === AUDIT_CHECKLIST[index].label
      && typeof entry.score === "number" && typeof entry.target === "number" && Array.isArray(entry.checks)
      && typeof entry.scoreFormula === "string"
      && entry.checks.length === AUDIT_CHECKLIST[index].checks.length
      && entry.checks.every((check, checkIndex) => check.id === AUDIT_CHECKLIST[index].checks[checkIndex].id
        && check.label === AUDIT_CHECKLIST[index].checks[checkIndex].label
        && ["pass", "fail", "unverified", "not_applicable"].includes(check.status)))
    && Array.isArray(result.priorities);
}

export const AUDIT_SCORING_STEPS = [
  "Preparing the audit workspace",
  "Reviewing scanned pages",
  "Running Google Lighthouse",
  "Checking Content",
  "Checking Design & Typography",
  "Checking Navigation & Structure",
  "Checking Accessibility & Compliance",
  "Checking Mobile Responsiveness",
  "Checking Search Engine Optimization",
  "Calculating scores and assembling the report",
];
