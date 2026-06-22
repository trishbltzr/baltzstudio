export type AuditSubcategoryRange = {
  title: string;
  end: number;
};

export const AUDIT_CHECKLIST_CATEGORIES = [
  "Content",
  "Design & Typography",
  "Navigation & Structure",
  "Accessibility & Compliance",
  "Mobile Responsiveness",
  "Search Engine Optimization (SEO)",
] as const;

export const AUDIT_CHECKLIST_SUBCATEGORY_RANGES: Record<string, AuditSubcategoryRange[]> = {
  "Design & Typography": [
    { title: "Forms & Text Fields", end: 11 },
    { title: "Inputs & Buttons", end: 17 },
    { title: "Type", end: 27 },
    { title: "Visual Design", end: 43 },
    { title: "Iconography, Images, & Illustration", end: 49 },
    { title: "System", end: Number.POSITIVE_INFINITY },
  ],
  "Accessibility & Compliance": [
    { title: "General", end: 10 },
    { title: "Errors & Alerts", end: 13 },
    { title: "Permissions", end: 17 },
    { title: "Form & Fields", end: 39 },
    { title: "Data", end: 40 },
    { title: "Help & Support", end: Number.POSITIVE_INFINITY },
  ],
  "Search Engine Optimization (SEO)": [
    { title: "Indexing", end: 8 },
    { title: "SEO Performance", end: 15 },
    { title: "Accessibility", end: 18 },
    { title: "Navigation", end: 22 },
    { title: "SEO Tools", end: Number.POSITIVE_INFINITY },
  ],
};
