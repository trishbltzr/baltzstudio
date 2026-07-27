import type { AuditType, BuilderType, View } from "./types";

type PortalLocation = Pick<Location, "pathname" | "search">;

const AUDIT_TYPES = new Set<AuditType>(["brand", "website", "seo"]);
const BUILDER_TYPES = new Set<BuilderType>(["website", "funnel", "social"]);

const VIEW_TO_PATH: Partial<Record<View, string>> = {
  progress: "",
  clients: "clients",
  tasks: "to-dos",
  review: "approvals",
  inbox: "inbox",
  activity: "activity",
  team: "team",
  playbooks: "playbooks",
  billing: "billing",
  invoices: "invoices",
  milestones: "journey",
  files: "files",
  assistant: "assistant",
  profile: "profile",
  settings: "settings",
  onboarding: "onboarding",
};

const PATH_TO_VIEW: Record<string, string> = Object.fromEntries(
  Object.entries(VIEW_TO_PATH)
    .filter(([, path]) => path)
    .map(([view, path]) => [path, view]),
);

const PATH_OWNED_PARAMS = [
  "view",
  "auditType",
  "builderType",
  "serviceRunId",
  "auditRun",
  "auditReport",
  "auditReportRun",
  "demo",
] as const;

function safeDecode(value: string | undefined) {
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function encodeSegment(value: string) {
  return encodeURIComponent(value.trim());
}

function dashboardSegments(pathname: string) {
  const match = pathname.match(/^\/dashboard(?:\/(.*))?\/?$/);
  if (!match) return [];
  return (match[1] || "").split("/").filter(Boolean).map(safeDecode);
}

function pathParams(pathname: string) {
  const segments = dashboardSegments(pathname);
  const params = new URLSearchParams();
  const [section, kind, qualifier, fourth, fifth] = segments;

  if (!section) return params;

  if (section === "checkups") {
    params.set("view", "audits");
    if (AUDIT_TYPES.has(kind as AuditType)) params.set("auditType", kind);
    if (qualifier === "draft" && fourth) params.set("auditRun", fourth);
    else if (qualifier === "report" && fourth) {
      params.set("auditReport", fourth);
      if (fifth) params.set("auditReportRun", fifth);
    } else if (qualifier) {
      params.set("serviceRunId", qualifier);
    }
    return params;
  }

  if (section === "labs") {
    params.set("view", "funnels");
    if (BUILDER_TYPES.has(kind as BuilderType)) params.set("builderType", kind);
    if (qualifier) params.set("serviceRunId", qualifier);
    return params;
  }

  const view = PATH_TO_VIEW[section];
  if (view) params.set("view", view);
  if (section === "activity" && kind) params.set("serviceRunId", kind);
  return params;
}

export function readPortalLocationParams(location?: PortalLocation) {
  const source = location || (typeof window !== "undefined" ? window.location : null);
  const params = new URLSearchParams(source?.search || "");
  if (!source) return params;
  const routed = pathParams(source.pathname);
  routed.forEach((value, key) => params.set(key, value));
  return params;
}

export function portalUrlFromParams(input: URLSearchParams) {
  const params = new URLSearchParams(input);
  const view = params.get("view") || "progress";
  const auditType = AUDIT_TYPES.has(params.get("auditType") as AuditType)
    ? params.get("auditType") as AuditType
    : "website";
  const builderType = BUILDER_TYPES.has(params.get("builderType") as BuilderType)
    ? params.get("builderType") as BuilderType
    : "funnel";
  const serviceRunId = params.get("serviceRunId")?.trim() || "";
  const auditRun = params.get("auditRun")?.trim() || "";
  const auditReport = params.get("auditReport")?.trim() || "";
  const auditReportRun = params.get("auditReportRun")?.trim() || "";
  let pathname = "/dashboard";

  if (view === "audits" || view === "audits_new" || view === "audit") {
    pathname = `/dashboard/checkups/${auditType}`;
    if (auditReport) {
      pathname += `/report/${encodeSegment(auditReport)}`;
      if (auditReportRun) pathname += `/${encodeSegment(auditReportRun)}`;
    } else if (auditRun) {
      pathname += `/draft/${encodeSegment(auditRun)}`;
    } else if (serviceRunId) {
      pathname += `/${encodeSegment(serviceRunId)}`;
    }
  } else if (view === "funnels") {
    pathname = `/dashboard/labs/${builderType}`;
    if (serviceRunId) pathname += `/${encodeSegment(serviceRunId)}`;
  } else if (view === "activity") {
    pathname = "/dashboard/activity";
    if (serviceRunId) pathname += `/${encodeSegment(serviceRunId)}`;
  } else {
    const segment = VIEW_TO_PATH[view as View];
    if (segment) pathname += `/${segment}`;
  }

  PATH_OWNED_PARAMS.forEach(key => params.delete(key));
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function replacePortalLocation(params: URLSearchParams) {
  if (typeof window === "undefined") return;
  window.history.replaceState({}, "", portalUrlFromParams(params));
}

export function portalHref(values: Record<string, string | null | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return portalUrlFromParams(params);
}
