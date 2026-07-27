"use client";

import { useState } from "react";
import { Icon } from "../icons";
import { SectionHeader } from "../components/SectionHeader";
import { css, displayPortalIdentity, initials, svcBadge } from "../helpers";
import { formatDashboardDate } from "@/lib/dateDisplay";
import { BRAND_SYSTEMS, SVC_META } from "../data";
import { usePortalStudioClients } from "../usePortalStudioClients";
import type { PortalActions, PortalState } from "../store";
import type { ClientProject } from "../types";
import type {
  PortalBookingLifecycleState,
  PortalAuditLifecycleState,
  PortalAutomationReviewState,
  PortalCareLifecycleState,
  PortalConsultLifecycleState,
  PortalDashboardAccessState,
  PortalDeliverableLifecycleState,
  PortalOfferLifecycleState,
  PortalPaymentLifecycleState,
  PortalPaymentDetailsReviewState,
  PortalWiawPaymentLifecycleState,
  PortalWiseQrHandling,
  PortalPaymentConfirmationMode,
  PortalDashboardAccessStartTrigger,
  PortalWiawPauseAccessPolicy,
  PortalWiawCancellationAccessPolicy,
  PortalIffAccessPolicy,
  PortalWhiteLabelAudience,
  PortalServiceOperationalEventType,
  PortalAiActionType,
} from "@/lib/portalWorkspacePersistence";
import { CLIENT_VISIBLE_SERVICE_EVENT_TYPES } from "@/lib/portalWorkspacePersistence";

interface AccessUser { name: string; email: string; access: string; studio: boolean }

const FOLDERS = [["Design Files", 0], ["Brand Assets", 0], ["Deliverables", 0], ["Audits", 0]] as const;
const SERVICE_EVENT_LABELS: Record<PortalServiceOperationalEventType, string> = {
  landing_page_signup_received: "Landing-page signup",
  lead_signup_submitted: "Lead signup submitted",
  form_reminder_due: "Form reminder",
  first_ai_audit_pass_completed: "First audit pass",
  second_ai_audit_pass_completed: "Second audit pass",
  paid_cocoon_offered: "Paid Cocoon offered",
  guided_call_reminder_due: "Guided-call reminder",
  strategy_handoff_ready: "Strategy handoff",
  dashboard_deletion_notice: "Dashboard deletion notice",
};
const AI_ACTION_LABELS: Record<PortalAiActionType, string> = {
  audit_draft: "Audit draft",
  audit_summary: "Audit summary",
  white_label_report: "White-label report",
  wise_payment_email: "Wise payment email",
  notification: "Notification",
  strategy_handoff: "Strategy handoff",
  wiaw_recommendation: "WIAW recommendation",
  launch_handoff: "Launch handoff",
};
const FILES: { name: string; ext: string; project: string; size: string; by: string; updated: string; status: string }[] = [];

function AvatarRow({ u }: { u: AccessUser }) {
  return (
    <div style={css("display:flex;align-items:center;gap:0.7rem;min-height:3.35rem;background:var(--surface-alt);border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.7rem 0.8rem")}>
      <span style={css("width:2rem;height:2rem;border-radius:50%;display:grid;place-items:center;font-size:var(--text-2xs);font-weight:500;flex-shrink:0;background:" + (u.studio ? "var(--lane-studio-soft)" : "var(--accent-soft)") + ";color:" + (u.studio ? "var(--lane-studio)" : "var(--accent)"))}>{initials(u.name).toUpperCase()}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={css("font-size:var(--text-base);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{u.name}</div>
        <div style={css("font-size:var(--text-2xs);color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{u.email}</div>
      </div>
      <span style={css("font-size:var(--text-2xs);font-weight:500;padding:0.12rem 0.5rem;border-radius:999px;background:" + (u.studio ? "var(--lane-studio-soft)" : "var(--surface-alt)") + ";color:" + (u.studio ? "var(--lane-studio)" : "var(--fg-muted)"))}>{u.access}</span>
    </div>
  );
}

type JourneyTone = "done" | "active" | "warn" | "idle";
const JOURNEY_TONE: Record<JourneyTone, string> = { done: "var(--success)", active: "var(--accent)", warn: "var(--warn)", idle: "var(--fg-faint)" };
const CONSULT_STEP: Record<string, [string, JourneyTone]> = { not_started: ["Not started", "idle"], link_sent: ["Link sent", "active"], intake_started: ["Intake started", "active"], intake_completed: ["Intake complete", "done"], audit_ready: ["Intake complete", "done"] };
const CHECKUP_STEP: Record<string, [string, JourneyTone]> = { not_started: ["Not started", "idle"], collecting: ["Collecting evidence", "active"], generated: ["Generated", "active"], review_ready: ["Ready for review", "warn"], approved: ["Approved", "done"], shared: ["Shared", "done"] };
const DELIVERABLE_STEP: Record<string, [string, JourneyTone]> = { not_started: ["Not started", "idle"], draft: ["In draft", "active"], review: ["In review", "warn"], approved: ["Approved", "done"], delivered: ["Delivered", "done"] };
const PAYMENT_STEP: Record<string, [string, JourneyTone]> = { not_started: ["Not requested", "idle"], email_prepared: ["Email prepared", "active"], email_sent: ["Email sent", "active"], pending: ["Pending", "warn"], confirmed: ["Confirmed", "done"], failed: ["Failed", "warn"], manual_review: ["Manual review", "warn"] };
const HANDOFF_STEP: Record<string, [string, JourneyTone]> = {
  not_offered: ["Not offered", "idle"],
  recommended: ["Recommended", "active"],
  workspace_unlocked: ["Unlocked", "active"],
  confirmed: ["Confirmed", "done"],
  paused: ["Paused", "warn"],
  cancelled: ["Cancelled", "warn"],
  complete: ["Complete", "done"],
};
function stepOf(map: Record<string, [string, JourneyTone]>, value: string | undefined): [string, JourneyTone] { return (value && map[value]) || ["—", "idle"]; }
const TONE_SOFT: Record<JourneyTone, string> = { done: "var(--success-soft)", active: "var(--accent-soft)", warn: "var(--warn-soft)", idle: "var(--surface)" };
type LcField =
  | { kind: "select"; label: string; key: string; value: string | undefined; options: [string, string][]; fallback?: string }
  | { kind: "date"; label: string; key: string; value: string | undefined }
  | { kind: "text"; label: string; key: string; value: string | undefined; placeholder?: string; raw?: boolean }
  | { kind: "textarea"; label: string; key: string; value: string | undefined; hint?: string };

export function ClientDetail({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [tab, setTab] = useState("overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteAccess, setInviteAccess] = useState("Client");
  const [serviceEventType, setServiceEventType] = useState<PortalServiceOperationalEventType>("lead_signup_submitted");
  const [serviceEventReviewed, setServiceEventReviewed] = useState(false);
  const { clients: rosterClients, loaded: rosterLoaded } = usePortalStudioClients();
  const name = state.clientDetail;
  const rosterClient = rosterClients.find(client => client.name === name);
  if (!name || (!rosterClient && rosterLoaded)) return null;
  if (!rosterClient) return <div style={css("padding:1.5rem;text-align:center;color:var(--fg-muted)")}>Loading client…</div>;
  const workspace = actions.workspaceForClient(name);
  const lifecycle = workspace.serviceLifecycle;
  const progress = lifecycle.auditState === "shared" ? 100
    : lifecycle.auditState === "approved" ? 90
      : lifecycle.auditState === "review_ready" ? 75
        : lifecycle.auditState === "generated" ? 55
          : lifecycle.auditState === "collecting" ? 25
            : 0;
  const pr: ClientProject = { id: `client-${rosterClient.id}`, client: name, name: "Client workspace", service: "cocoon", stage: lifecycle.currentDevelopmentStage || "Not started", progress, dev: rosterClient.owner, health: lifecycle.nextRequiredAction ? "at_risk" : "on_track", due: "—", amount: "—", wise: "awaiting" };
  const fields = [
    ["Client owner", displayPortalIdentity(pr.dev)],
    ["Service · stage", pr.stage],
    ["Email", rosterClient.lead.email],
    ["Phone", rosterClient.lead.phone],
    ["Website", rosterClient.lead.website],
  ].filter(([, value]) => Boolean(value));
  const users: AccessUser[] = [
    ...(rosterClient.lead.email ? [{
      name: rosterClient.lead.contactName || name,
      email: rosterClient.lead.email,
      access: "Client",
      studio: false,
    }] : []),
    { name: displayPortalIdentity(pr.dev), email: "studio@baltz.studio", access: "Studio", studio: true },
  ];
  const usersWithCollaborators = [
    ...workspace.collaborators.map(collaborator => ({
      name: collaborator.name,
      email: collaborator.email,
      access: collaborator.access,
      studio: collaborator.studio,
    })),
    ...users,
  ];
  const allFiles = [
    ...workspace.files.map(file => ({ name: file.name, ext: file.ext, project: file.folder, size: file.sizeLabel, by: file.by, updated: formatDashboardDate(file.updated, file.updated), status: file.status })),
    ...FILES,
  ];

  const sys = workspace.brandSystem || BRAND_SYSTEMS[name] || { colors: [], fonts: [], tone: { traits: [], scales: [], avoid: "" } };
  const secondary = sys.colors[1]?.[1] || sys.colors[0]?.[1] || "var(--accent)";
  const auditData = workspace.brandAudit?.session.data;
  const auditToneTraits = Array.isArray(auditData?.voice)
    ? auditData.voice.map(value => String(value).trim()).filter(Boolean)
    : typeof auditData?.voice === "string"
      ? auditData.voice.split(/\r?\n|,|;/).map(value => value.trim()).filter(Boolean)
      : [];
  const toneTraits = sys.tone.traits.length ? sys.tone.traits : auditToneTraits;
  const auditToneAvoid = typeof auditData?.avoid === "string" ? auditData.avoid.trim() : "";
  const toneAvoid = sys.tone.avoid?.trim() || auditToneAvoid;
  const cocoonLinkMeta = lifecycle.consultState === "audit_ready" || lifecycle.consultState === "intake_completed"
    ? { label: lifecycle.consultState === "audit_ready" ? "Results ready" : "Intake completed", tone: "var(--success)", soft: "var(--success-soft)" }
    : lifecycle.consultState === "link_sent" || lifecycle.consultState === "intake_started"
      ? { label: "Link sent", tone: "var(--warn)", soft: "var(--warn-soft)" }
      : { label: "Not sent", tone: "var(--fg-muted)", soft: "var(--surface-alt)" };
  const lifecycleSelect = "width:100%;height:2.35rem;padding:0 .7rem;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface);color:var(--fg);font:inherit;font-size:var(--text-xs)";
  const lifecycleDateValue = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString().slice(0, 16) : "";
  const lifecycleDate = (value: string) => value ? new Date(value).toISOString() : undefined;

  const tabs = state.role === "client"
    ? [{ id: "overview", label: "Overview" }, { id: "brand", label: "Brand" }, { id: "files", label: "Files" }]
    : [{ id: "overview", label: "Overview" }, { id: "ops", label: "Operations" }, { id: "ai", label: "AI review" }, { id: "brand", label: "Brand" }, { id: "files", label: "Files" }];
  const activeTab = tabs.some(t => t.id === tab) ? tab : "overview";
  const stepDate = (value?: string) => value ? formatDashboardDate(value, value) : "—";
  const [consultLabel, consultTone] = stepOf(CONSULT_STEP, lifecycle.consultState);
  const [checkupLabel, checkupTone] = stepOf(CHECKUP_STEP, lifecycle.auditState);
  const [deliverableLabel, deliverableTone] = stepOf(DELIVERABLE_STEP, lifecycle.deliverableState);
  const [paymentLabel, paymentTone] = stepOf(PAYMENT_STEP, lifecycle.paymentState);
  const [handoffLabel, handoffTone] = stepOf(HANDOFF_STEP, lifecycle.wiawState);
  const journey: { label: string; state: string; tone: JourneyTone; meta: string }[] = [
    { label: "Consult", state: consultLabel, tone: consultTone, meta: stepDate(lifecycle.formCompletedAt || lifecycle.consultLinkSentAt) },
    { label: "Checkup", state: checkupLabel, tone: checkupTone, meta: stepDate(lifecycle.auditApprovedAt || lifecycle.auditReviewedAt || lifecycle.auditGeneratedAt) },
    { label: "Deliverable", state: deliverableLabel, tone: deliverableTone, meta: "—" },
    { label: "Payment", state: paymentLabel, tone: paymentTone, meta: stepDate(lifecycle.paymentConfirmedAt || lifecycle.paymentEmailSentAt) },
    { label: "Handoff", state: handoffLabel, tone: handoffTone, meta: stepDate(lifecycle.wiawPaymentConfirmedAt) },
  ];
  const nextAction = lifecycle.nextRequiredAction?.trim();

  const patchLifecycle = (patch: Record<string, string | undefined>) =>
    actions.updateClientServiceLifecycle(name, patch as Parameters<typeof actions.updateClientServiceLifecycle>[1]);
  const renderLcField = (f: LcField) => {
    if (f.kind === "select") return (
      <label key={f.key} style={css("display:flex;flex-direction:column;gap:.35rem;font-size:var(--text-2xs);font-weight:500;color:var(--fg-muted)")}>{f.label}
        <select value={f.value ?? f.fallback ?? ""} onChange={event => patchLifecycle({ [f.key]: event.target.value })} style={css(lifecycleSelect)}>
          {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
    );
    if (f.kind === "date") return (
      <label key={f.key} style={css("display:flex;flex-direction:column;gap:.35rem;font-size:var(--text-2xs);font-weight:500;color:var(--fg-muted)")}>{f.label}
        <input type="datetime-local" value={lifecycleDateValue(f.value)} onChange={event => patchLifecycle({ [f.key]: lifecycleDate(event.target.value) })} style={css(lifecycleSelect)} />
      </label>
    );
    if (f.kind === "textarea") return (
      <label key={f.key} style={css("grid-column:1/-1;display:flex;flex-direction:column;gap:.35rem;font-size:var(--text-2xs);font-weight:500;color:var(--fg-muted)")}>{f.label}
        <textarea rows={7} value={f.value ?? ""} onChange={event => patchLifecycle({ [f.key]: event.target.value })} style={css(lifecycleSelect + ";resize:vertical;line-height:1.45")} />
        {f.hint && <span style={css("font-weight:400;color:var(--fg-faint)")}>{f.hint}</span>}
      </label>
    );
    return (
      <label key={f.key} style={css("display:flex;flex-direction:column;gap:.35rem;font-size:var(--text-2xs);font-weight:500;color:var(--fg-muted)")}>{f.label}
        <input value={f.value ?? ""} onChange={event => patchLifecycle({ [f.key]: f.raw ? event.target.value : (event.target.value.trim() || undefined) })} placeholder={f.placeholder} style={css(lifecycleSelect)} />
      </label>
    );
  };
  const opsGroups: { key: string; title: string; icon: string; tone: JourneyTone; pill: string; summary: string; fields: LcField[] }[] = [
    { key: "consult", title: "Consult & intake", icon: "link", tone: consultTone, pill: consultLabel,
      summary: consultLabel + (lifecycle.formCompletedAt ? " · captured " + stepDate(lifecycle.formCompletedAt) : ""),
      fields: [
        { kind: "select", label: "Cocoon Consult", key: "consultState", value: lifecycle.consultState, options: [["not_started", "Not started"], ["link_sent", "Link sent"], ["intake_started", "Intake started"], ["intake_completed", "Intake completed"], ["audit_ready", "Audit ready"]] },
        { kind: "text", label: "Paid Cocoon package label", key: "cocoonPackageLabel", value: lifecycle.cocoonPackageLabel ?? "Cocoon Consult", raw: true },
        { kind: "date", label: "Cocoon link sent", key: "consultLinkSentAt", value: lifecycle.consultLinkSentAt },
        { kind: "date", label: "Form started", key: "formStartedAt", value: lifecycle.formStartedAt },
        { kind: "date", label: "Form completed", key: "formCompletedAt", value: lifecycle.formCompletedAt },
      ] },
    { key: "checkup", title: "Checkup", icon: "chart", tone: checkupTone, pill: checkupLabel,
      summary: checkupLabel + (lifecycle.auditGeneratedAt ? " · generated " + stepDate(lifecycle.auditGeneratedAt) : ""),
      fields: [
        { kind: "select", label: "Checkup", key: "auditState", value: lifecycle.auditState, options: [["not_started", "Not started"], ["collecting", "Collecting evidence"], ["generated", "Generated"], ["review_ready", "Ready for review"], ["approved", "Approved"], ["shared", "Shared"]] },
        { kind: "date", label: "Audit generated", key: "auditGeneratedAt", value: lifecycle.auditGeneratedAt },
        { kind: "date", label: "Audit reviewed", key: "auditReviewedAt", value: lifecycle.auditReviewedAt },
        { kind: "date", label: "Audit approved", key: "auditApprovedAt", value: lifecycle.auditApprovedAt },
      ] },
    { key: "deliverable", title: "Deliverable & automation", icon: "file", tone: deliverableTone, pill: deliverableLabel,
      summary: deliverableLabel + (lifecycle.nextRequiredAction ? " · next: " + lifecycle.nextRequiredAction : ""),
      fields: [
        { kind: "select", label: "Deliverable", key: "deliverableState", value: lifecycle.deliverableState, options: [["not_started", "Not started"], ["draft", "Draft"], ["review", "In review"], ["approved", "Approved"], ["delivered", "Delivered"]] },
        { kind: "select", label: "Automation review", key: "automationReviewState", value: lifecycle.automationReviewState, options: [["not_required", "Not required"], ["draft", "Draft"], ["review_required", "Review required"], ["approved", "Approved"], ["rejected", "Rejected"]] },
        { kind: "text", label: "Current development stage", key: "currentDevelopmentStage", value: lifecycle.currentDevelopmentStage, placeholder: "e.g. Checkup review" },
        { kind: "text", label: "Next development stage", key: "nextDevelopmentStage", value: lifecycle.nextDevelopmentStage, placeholder: "e.g. Strategy handoff" },
        { kind: "text", label: "Next required action", key: "nextRequiredAction", value: lifecycle.nextRequiredAction, placeholder: "Short, specific next action" },
        { kind: "select", label: "White-label audience", key: "whiteLabelAudience", value: lifecycle.whiteLabelAudience, fallback: "clients", options: [["clients", "Clients"], ["partners", "Partners"], ["both", "Clients and partners"]] },
      ] },
    { key: "payments", title: "Payments", icon: "card", tone: paymentTone, pill: paymentLabel,
      summary: "Wise · " + paymentLabel.toLowerCase(),
      fields: [
        { kind: "select", label: "Wise payment", key: "paymentState", value: lifecycle.paymentState, options: [["not_started", "Not requested"], ["email_prepared", "Email prepared"], ["email_sent", "Email sent"], ["pending", "Pending confirmation"], ["confirmed", "Confirmed"], ["failed", "Failed"], ["manual_review", "Manual review"]] },
        { kind: "select", label: "Wise details review", key: "paymentDetailsState", value: lifecycle.paymentDetailsState, options: [["not_prepared", "Not prepared"], ["draft", "Draft"], ["approved", "Approved"], ["sent", "Sent"]] },
        { kind: "select", label: "Payment confirmation", key: "paymentConfirmationMode", value: lifecycle.paymentConfirmationMode, fallback: "manual_only", options: [["manual_only", "Manual only"], ["manual_or_matched", "Manual or verified match"]] },
        { kind: "select", label: "Wise QR handling", key: "wiseQrHandling", value: lifecycle.wiseQrHandling, fallback: "approved_asset", options: [["approved_asset", "Approved QR asset"], ["secure_link", "Approved secure link"], ["none", "No QR"]] },
        { kind: "text", label: "Wise recipient", key: "paymentRecipientLabel", value: lifecycle.paymentRecipientLabel, placeholder: "Verified recipient name" },
        { kind: "text", label: "Wise QR asset", key: "paymentQrAssetReference", value: lifecycle.paymentQrAssetReference, placeholder: "Approved file or asset reference" },
        { kind: "text", label: "Wise confirmation reference", key: "paymentConfirmationReference", value: lifecycle.paymentConfirmationReference, placeholder: "Add after matching the transfer" },
        { kind: "date", label: "Wise email sent", key: "paymentEmailSentAt", value: lifecycle.paymentEmailSentAt },
        { kind: "date", label: "Wise payment confirmed", key: "paymentConfirmedAt", value: lifecycle.paymentConfirmedAt },
        { kind: "text", label: "Wise email subject", key: "wisePaymentEmailSubject", value: lifecycle.wisePaymentEmailSubject, raw: true },
        { kind: "textarea", label: "Wise email body", key: "wisePaymentEmailBody", value: lifecycle.wisePaymentEmailBody, hint: "Available tokens: {client_name} and {transfer_reference}. Email and payment details still require staff review." },
        { kind: "select", label: "WIAW payment", key: "wiawPaymentState", value: lifecycle.wiawPaymentState, options: [["not_required", "Not requested"], ["pending", "Pending confirmation"], ["confirmed", "Confirmed"], ["manual_review", "Manual review"]] },
        { kind: "date", label: "WIAW payment confirmed", key: "wiawPaymentConfirmedAt", value: lifecycle.wiawPaymentConfirmedAt },
      ] },
    { key: "handoff", title: "Access & handoff", icon: "shield", tone: handoffTone, pill: handoffLabel,
      summary: "WIAW " + handoffLabel.toLowerCase() + " · dashboard " + lifecycle.dashboardAccessState.replace(/_/g, " "),
      fields: [
        { kind: "select", label: "Guided call", key: "bookingState", value: lifecycle.bookingState, options: [["locked", "Locked"], ["unlocked", "Unlocked"], ["booked", "Booked"], ["completed", "Completed"]] },
        { kind: "date", label: "Guided call booked", key: "guidedCallBookedAt", value: lifecycle.guidedCallBookedAt },
        { kind: "date", label: "Guided call completed", key: "guidedCallCompletedAt", value: lifecycle.guidedCallCompletedAt },
        { kind: "date", label: "Guidance starts", key: "guidanceWindowStartsAt", value: lifecycle.guidanceWindowStartsAt },
        { kind: "date", label: "Guidance ends", key: "guidanceWindowEndsAt", value: lifecycle.guidanceWindowEndsAt },
        { kind: "select", label: "WIAW", key: "wiawState", value: lifecycle.wiawState, options: [["not_offered", "Not offered"], ["recommended", "Recommended"], ["workspace_unlocked", "Workspace unlocked"], ["confirmed", "Confirmed"], ["paused", "Paused"], ["cancelled", "Cancelled"], ["complete", "Complete"]] },
        { kind: "select", label: "WIAW access while paused", key: "wiawPauseAccessPolicy", value: lifecycle.wiawPauseAccessPolicy, fallback: "continue", options: [["continue", "Continue access"], ["suspend", "Suspend access"]] },
        { kind: "select", label: "WIAW access when cancelled", key: "wiawCancellationAccessPolicy", value: lifecycle.wiawCancellationAccessPolicy, fallback: "end_immediately", options: [["end_immediately", "End immediately"], ["manual_end", "Keep until staff ends it"]] },
        { kind: "select", label: "In Full Flight", key: "iffState", value: lifecycle.iffState, options: [["not_offered", "Not offered"], ["offered", "Offered"], ["active", "Active"], ["paused", "Paused"], ["cancelled", "Cancelled"]] },
        { kind: "select", label: "In Full Flight access", key: "iffAccessPolicy", value: lifecycle.iffAccessPolicy, fallback: "active_subscription", options: [["active_subscription", "Active care plan"], ["manual", "Manual access"]] },
        { kind: "select", label: "Dashboard access", key: "dashboardAccessState", value: lifecycle.dashboardAccessState, options: [["not_started", "Not started"], ["active", "Active"], ["suspended", "Suspended"], ["ending", "Ending"], ["expired", "Expired"], ["deletion_scheduled", "Deletion scheduled"], ["deleted", "Deleted"]] },
        { kind: "select", label: "Three-month access starts", key: "dashboardAccessStartTrigger", value: lifecycle.dashboardAccessStartTrigger, fallback: "payment_confirmation", options: [["payment_confirmation", "Payment confirmation"], ["booking_recorded", "Booking recorded"], ["guided_call_completion", "Guided call completion"], ["manual", "Manual date"]] },
        { kind: "date", label: "Dashboard access starts", key: "dashboardAccessStartsAt", value: lifecycle.dashboardAccessStartsAt },
        { kind: "date", label: "Dashboard access ends", key: "dashboardAccessEndsAt", value: lifecycle.dashboardAccessEndsAt },
      ] },
  ];

  return (
    <div style={css("display:flex;flex-direction:column;gap:var(--space-4)")}>
      <div style={css("display:flex;align-items:center;gap:0.6rem")}>
        <button onClick={actions.backToClients} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;gap:0.3rem;padding:0.4rem 0.85rem 0.4rem 0.7rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer")}>‹ All Clients</button>
        <button onClick={actions.previewAsClient} className="pt-iconbtn" style={css("margin-left:auto;display:inline-flex;align-items:center;gap:0.35rem;padding:0.4rem 0.9rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer")}><Icon name="eye" size={15} />Preview Portal</button>
      </div>

      {/* client header + journey strip */}
      <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1.2rem 1.4rem")}>
        <div style={css("display:flex;align-items:center;gap:0.9rem;flex-wrap:wrap")}>
          <span style={css("width:3rem;height:3rem;border-radius:0.85rem;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:500;font-size:var(--text-xl);flex-shrink:0")}>{name[0]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={css("font-size:var(--text-2xl);font-weight:500;line-height:1.15;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{name}</div>
            <div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.12rem")}>{pr.name} · {usersWithCollaborators.length} with access</div>
          </div>
          <span style={css(svcBadge(pr.service))}>{SVC_META[pr.service].short}</span>
        </div>
        <div style={css("margin-top:1.15rem;border-top:1px solid var(--border-soft);padding-top:1rem;overflow-x:auto")}>
          <div style={css("display:grid;grid-template-columns:repeat(5,minmax(9.5rem,1fr));min-width:min-content")}>
            {journey.map((s, idx) => (
              <div key={s.label} style={css("display:flex;flex-direction:column;gap:0.5rem;padding:0.1rem 1.3rem" + (idx === 0 ? ";padding-left:0" : ";border-left:1px solid var(--border-soft)"))}>
                <span style={css("font-size:var(--text-label);font-weight:500;letter-spacing:0.05em;text-transform:uppercase;color:var(--fg-faint)")}>{s.label}</span>
                <span style={css("display:inline-flex;align-items:center;gap:0.5rem;font-size:var(--text-base);font-weight:500;color:" + (s.tone === "idle" ? "var(--fg-muted)" : "var(--fg)"))}><span style={css("width:0.44rem;height:0.44rem;border-radius:50%;flex-shrink:0;background:" + JOURNEY_TONE[s.tone] + (s.tone === "idle" ? ";opacity:0.5" : ""))} />{s.state}</span>
                <span style={css("display:flex;align-items:center;gap:0.45rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{s.meta}{s.tone === "warn" && <span style={css("font-size:var(--text-label);font-weight:500;letter-spacing:0.03em;text-transform:uppercase;color:var(--warn);background:var(--warn-soft);padding:0.1rem 0.4rem;border-radius:999px")}>Needs you</span>}</span>
              </div>
            ))}
          </div>
        </div>
        {nextAction && <div style={css("display:flex;align-items:center;gap:0.75rem;margin-top:1.15rem;padding:0.8rem 0.9rem;border-radius:var(--radius);background:var(--accent-soft);border:1px solid color-mix(in srgb,var(--accent) 22%,transparent)")}>
          <span style={css("width:1.9rem;height:1.9rem;border-radius:0.55rem;background:var(--surface);color:var(--accent);display:grid;place-items:center;flex-shrink:0")}><Icon name="arrowright" size={15} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={css("font-size:var(--text-label);font-weight:500;letter-spacing:0.05em;text-transform:uppercase;color:var(--accent)")}>{state.role === "client" ? "What happens next" : "Next action · Studio"}</div>
            <div style={css("font-size:var(--text-sm);font-weight:500;color:var(--fg);margin-top:0.1rem")}>{nextAction}</div>
          </div>
        </div>}
      </section>

      {/* tabs */}
      <div style={css("display:flex;gap:0.25rem;flex-wrap:wrap;padding:0.25rem;background:color-mix(in srgb,var(--fg) 6%,var(--surface));border:1px solid var(--border-soft);border-radius:var(--radius-pill);width:fit-content;max-width:100%")} role="tablist">
        {tabs.map(t => <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} onClick={() => setTab(t.id)} style={css("border:none;font:inherit;font-size:var(--text-sm);font-weight:500;padding:0.45rem 0.95rem;border-radius:var(--radius-pill);cursor:pointer;white-space:nowrap;transition:background .15s,color .15s;background:" + (activeTab === t.id ? "var(--surface)" : "transparent") + ";color:" + (activeTab === t.id ? "var(--fg)" : "var(--fg-muted)") + (activeTab === t.id ? ";box-shadow:0 1px 2px rgba(60,40,30,.08)" : ""))}>{t.label}</button>)}
      </div>

      {activeTab === "overview" && <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "minmax(0,1.15fr) minmax(20rem,0.85fr)") + ";gap:0.9rem;align-items:stretch")}>
      {/* details */}
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        <SectionHeader inset title="Client essentials" sub="Everything you need to place this client — one source of truth." />
        <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "repeat(2,minmax(0,1fr))") + ";gap:0.55rem;padding:0.9rem")}>
          {fields.map(([label, value]) => (
            <div key={label} style={css("display:flex;flex-direction:column;justify-content:center;min-height:3.8rem;background:var(--surface-alt);border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.68rem 0.8rem")}>
              <div style={css("font-size:var(--text-2xs);letter-spacing:0;color:var(--fg-faint);font-weight:500;margin-bottom:0.28rem")}>{label}</div>
              <div style={css("font-size:var(--text-base);color:var(--fg)")}>{value}</div>
            </div>
          ))}
          {(toneTraits.length > 0 || toneAvoid) && <div style={css("grid-column:1/-1;background:var(--surface-alt);border:1px solid var(--border-soft);border-radius:var(--radius);padding:0.75rem 0.85rem")}>
            <div style={css("font-size:var(--text-2xs);letter-spacing:0;color:var(--fg-faint);font-weight:500;margin-bottom:0.45rem")}>Voice &amp; Tone</div>
            {toneTraits.length > 0 && <div style={css("display:flex;flex-wrap:wrap;gap:0.38rem")}>{toneTraits.map(trait => <span key={trait} style={css("font-size:var(--text-2xs);font-weight:500;padding:0.28rem 0.65rem;border-radius:999px;border:1px solid color-mix(in srgb," + secondary + " 38%,var(--border-soft));background:color-mix(in srgb," + secondary + " 10%,var(--surface));color:var(--fg)")}>{trait}</span>)}</div>}
            {toneAvoid && <div style={css("margin-top:" + (toneTraits.length ? "0.55rem" : "0") + ";font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}><strong style={css("font-weight:600;color:var(--danger)")}>Avoid:</strong> {toneAvoid}</div>}
          </div>}
        </div>
      </div>

      {/* access */}
      <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;display:flex;flex-direction:column")}>
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:0.6rem;padding:1rem 1.1rem;border-bottom:1px solid var(--border-soft)")}>
          <div><div style={css("font-size:var(--text-md);font-weight:500;color:var(--fg)")}>People with access</div><div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.14rem")}>{usersWithCollaborators.length} collaborators</div></div>
          <button onClick={() => setInviteOpen(true)} className="pt-iconbtn" style={css("display:inline-flex;align-items:center;gap:0.3rem;padding:0.35rem 0.8rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500;cursor:pointer")}><Icon name="plus" size={15} />Add collaborator</button>
        </div>
        <div style={css("display:flex;flex:1;flex-direction:column;gap:0.55rem;padding:0.9rem")}>
          {usersWithCollaborators.map(u => <AvatarRow key={u.email} u={u} />)}
        </div>
      </div>
      </div>}

      {activeTab === "ops" && state.role === "admin" && <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden") }>
        <SectionHeader inset title="Lead intake" sub="Preview landing-page context and manual Cocoon Consult delivery status." right={<span style={css("padding:.2rem .5rem;border-radius:999px;background:var(--surface-alt);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500")}>Mock data</span>} />
        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(18rem,100%),1fr));gap:var(--space-3);padding:.9rem") }>
          <div style={css("display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--space-2);padding:var(--space-3);border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt)") }>
            {[
              ["Contact", rosterClient.lead.contactName],
              ["Business", rosterClient.lead.businessName],
              ["Email", rosterClient.lead.email],
              ["Phone", rosterClient.lead.phone],
              ["Website", rosterClient.lead.website],
              ["Captured", rosterClient.lead.capturedAt],
            ].map(([label, value]) => <div key={label} style={css("min-width:0") }><span style={css("display:block;font-size:var(--text-2xs);font-weight:500;color:var(--fg-faint)")}>{label}</span><strong style={css("display:block;margin-top:.16rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-xs);font-weight:500;color:var(--fg)")} title={value}>{value}</strong></div>)}
          </div>
          <div style={css("display:flex;flex-direction:column;justify-content:center;gap:.65rem;padding:.85rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt)") }>
            <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.65rem") }><div><span style={css("display:block;font-size:var(--text-2xs);font-weight:500;color:var(--fg-faint)")}>Cocoon Consult link</span><strong style={css("display:block;margin-top:.16rem;font-size:var(--text-base);font-weight:500")}>{cocoonLinkMeta.label}</strong></div><span style={css("width:2rem;height:2rem;border-radius:50%;display:grid;place-items:center;background:" + cocoonLinkMeta.soft + ";color:" + cocoonLinkMeta.tone)}><Icon name={rosterClient.cocoonLink.status === "completed" ? "check" : "link"} size={14}/></span></div>
            <p style={css("margin:0;font-size:var(--text-xs);line-height:1.5;color:var(--fg-muted)")}>{lifecycle.updatedAt ? `Recorded ${formatDashboardDate(lifecycle.updatedAt, lifecycle.updatedAt)}.` : "No durable delivery event is recorded yet."}</p>
            <span style={css("align-self:flex-start;padding:.2rem .5rem;border-radius:999px;background:" + cocoonLinkMeta.soft + ";color:" + cocoonLinkMeta.tone + ";font-size:var(--text-2xs);font-weight:500")}>{lifecycle.consultState === "not_started" ? "Manual action required" : "Lifecycle event recorded"}</span>
          </div>
        </div>
      </section>}

      {activeTab === "ops" && state.role !== "client" && <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        <SectionHeader inset title="Operations & lifecycle" sub="Record only verified states — client notifications derive from these. Expand a phase to edit its fields." right={<span style={css("padding:.2rem .5rem;border-radius:999px;background:var(--warn-soft);color:var(--warn);font-size:var(--text-2xs);font-weight:500")}>Staff only</span>} />
        <div className="pt-lc-accord">
          {opsGroups.map(group => (
            <details key={group.key} className="pt-lc-group" open={group.tone === "warn"}>
              <summary>
                <span className="pt-lc-ic" style={css("background:" + TONE_SOFT[group.tone] + ";color:" + JOURNEY_TONE[group.tone] + (group.tone === "idle" ? ";border:1px solid var(--border-soft)" : ""))}><Icon name={group.icon} size={14} /></span>
                <span className="pt-lc-head"><strong>{group.title}</strong><span title={group.summary}>{group.summary}</span></span>
                <span className="pt-lc-pill" style={css(group.tone === "idle" ? "background:var(--surface);color:var(--fg-muted);border:1px solid var(--border)" : "background:" + TONE_SOFT[group.tone] + ";color:" + JOURNEY_TONE[group.tone])}>{group.pill}</span>
                <span className="pt-lc-caret" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></span>
              </summary>
              <div className="pt-lc-body">{group.fields.map(renderLcField)}</div>
            </details>
          ))}
        </div>
        <div style={css("margin:0 .9rem .9rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt);padding:.8rem .85rem")}>
          <div style={css("display:flex;align-items:center;gap:.4rem;font-size:var(--text-2xs);font-weight:500;color:var(--fg-faint);margin-bottom:.6rem")}><Icon name="activity" size={13} />Log a journey milestone</div>
          <div style={css("display:flex;gap:.55rem;flex-wrap:wrap;align-items:center")}>
            <select value={serviceEventType} onChange={event => setServiceEventType(event.target.value as PortalServiceOperationalEventType)} style={css(lifecycleSelect + ";flex:1 1 15rem")}>
              <option value="landing_page_signup_received">Landing-page signup received</option>
              <option value="lead_signup_submitted">Lead signup submitted</option>
              <option value="form_reminder_due">Form reminder due</option>
              <option value="first_ai_audit_pass_completed">First AI audit pass complete</option>
              <option value="second_ai_audit_pass_completed">Second AI audit pass complete</option>
              <option value="paid_cocoon_offered">Paid Cocoon offered</option>
              <option value="guided_call_reminder_due">Guided-call reminder due</option>
              <option value="strategy_handoff_ready">Strategy handoff ready</option>
              <option value="dashboard_deletion_notice">Dashboard deletion notice</option>
            </select>
            <label title={CLIENT_VISIBLE_SERVICE_EVENT_TYPES.has(serviceEventType) ? "Sends this milestone to the client" : "Marks this internal milestone reviewed"} style={css("display:inline-flex;align-items:center;gap:.4rem;font-size:var(--text-2xs);color:var(--fg-muted);cursor:pointer;white-space:nowrap")}>
              <input type="checkbox" checked={serviceEventReviewed} onChange={event => setServiceEventReviewed(event.target.checked)} style={css("accent-color:var(--accent)")} />
              {CLIENT_VISIBLE_SERVICE_EVENT_TYPES.has(serviceEventType) ? "Notify the client" : "Mark reviewed"}
            </label>
            <button type="button" onClick={() => { actions.recordClientServiceEvent(name, serviceEventType, serviceEventReviewed); setServiceEventReviewed(false); }} className="pt-op" style={css("height:2.35rem;padding:0 1rem;border:none;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:var(--text-xs);font-weight:500;cursor:pointer;white-space:nowrap")}>{CLIENT_VISIBLE_SERVICE_EVENT_TYPES.has(serviceEventType) && serviceEventReviewed ? "Log & notify" : "Log milestone"}</button>
          </div>
        </div>
        {workspace.serviceEvents.length > 0 && <div style={css("display:flex;flex-direction:column;gap:.45rem;padding:0 .9rem .9rem")}>
          {[...workspace.serviceEvents].reverse().slice(0, 5).map(event => (
            <div key={event.id} style={css("display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.7rem;align-items:center;padding:.62rem .7rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt)")}>
              <div style={{ minWidth: 0 }}>
                <div style={css("display:flex;align-items:center;gap:.4rem;min-width:0")}><strong style={css("overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-xs);font-weight:500")}>{SERVICE_EVENT_LABELS[event.type]}</strong><span style={css("padding:.12rem .38rem;border-radius:999px;background:" + (event.status === "active" ? "var(--warn-soft)" : "var(--success-soft)") + ";color:" + (event.status === "active" ? "var(--warn)" : "var(--success)") + ";font-size:var(--text-2xs);font-weight:500")}>{event.status === "active" ? "Open" : "Resolved"}</span></div>
                <div style={css("margin-top:.15rem;font-size:var(--text-2xs);color:var(--fg-muted)")}>{formatDashboardDate(event.occurredAt, event.occurredAt)} · {event.reviewed ? "Reviewed" : "Staff only"} · {event.assignee || "Studio team"}</div>
              </div>
              {event.status === "active" && <button type="button" onClick={() => actions.resolveClientServiceEvent(name, event.id)} style={css("height:1.9rem;padding:0 .65rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>Resolve</button>}
            </div>
          ))}
        </div>}
        {workspace.auditTrail.length > 0 && <div style={css("border-top:1px solid var(--border-soft);padding:.9rem")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-bottom:.55rem")}>
            <strong style={css("font-size:var(--text-xs);font-weight:500")}>Client action audit trail</strong>
            <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{workspace.auditTrail.length} recorded</span>
          </div>
          <div style={css("display:flex;flex-direction:column;gap:.4rem")}>
            {[...workspace.auditTrail].reverse().slice(0, 8).map(record => (
              <div key={record.id} style={css("display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.7rem;align-items:center;padding:.58rem .68rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt)")}>
                <div style={{ minWidth: 0 }}>
                  <strong style={css("display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--text-xs);font-weight:500")}>{record.summary}</strong>
                  <span style={css("display:block;margin-top:.12rem;font-size:var(--text-2xs);color:var(--fg-muted)")}>{record.actor} · {formatDashboardDate(record.occurredAt, record.occurredAt)}</span>
                </div>
                <span style={css("padding:.14rem .4rem;border-radius:999px;background:" + (record.clientVisible ? "var(--success-soft)" : "var(--surface)") + ";color:" + (record.clientVisible ? "var(--success)" : "var(--fg-faint)") + ";font-size:var(--text-2xs);font-weight:500;white-space:nowrap")}>{record.clientVisible ? "Client-visible" : "Internal"}</span>
              </div>
            ))}
          </div>
        </div>}
      </section>}

      {activeTab === "ai" && state.role !== "client" && <section style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        <SectionHeader inset title="AI output review" sub="Drafts stay staff-only until a person approves the client-safe preview." right={<span style={css("padding:.2rem .5rem;border-radius:999px;background:var(--lane-studio-soft);color:var(--lane-studio);font-size:var(--text-2xs);font-weight:500")}>Human gate</span>} />
        <div style={css("display:flex;flex-direction:column;gap:.5rem;padding:.9rem")}>
          {[...workspace.aiActions].reverse().map(action => (
            <article key={action.id} style={css("display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.8rem;align-items:start;padding:.75rem .8rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt)")}>
              <div style={{ minWidth: 0 }}>
                <div style={css("display:flex;align-items:center;gap:.45rem;flex-wrap:wrap")}><strong style={css("font-size:var(--text-xs);font-weight:500")}>{AI_ACTION_LABELS[action.type]}</strong><span style={css("padding:.12rem .4rem;border-radius:999px;background:" + (action.status === "approved" ? "var(--success-soft)" : action.status === "rejected" ? "var(--danger-soft)" : "var(--warn-soft)") + ";color:" + (action.status === "approved" ? "var(--success)" : action.status === "rejected" ? "var(--danger)" : "var(--warn)") + ";font-size:var(--text-2xs);font-weight:500")}>{action.status === "review_required" ? "Review required" : action.status}</span></div>
                <p style={css("margin:.38rem 0 0;font-size:var(--text-xs);line-height:1.5;color:var(--fg)")}>{action.clientSafePreview}</p>
                <div style={css("margin-top:.35rem;font-size:var(--text-2xs);color:var(--fg-muted)")}>Drafted by {action.createdBy} · {formatDashboardDate(action.createdAt, action.createdAt)}{action.reviewedBy ? ` · Reviewed by ${action.reviewedBy}` : ""}</div>
              </div>
              {action.status === "review_required" && <div style={css("display:flex;gap:.4rem")}>
                <button type="button" onClick={() => actions.reviewClientAiAction(name, action.id, "rejected")} style={css("height:1.95rem;padding:0 .65rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--danger);font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>Reject</button>
                <button type="button" onClick={() => actions.reviewClientAiAction(name, action.id, "approved")} style={css("height:1.95rem;padding:0 .7rem;border:none;border-radius:999px;background:var(--success);color:#fff;font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>Approve</button>
              </div>}
            </article>
          ))}
          {!workspace.aiActions.length && <div style={css("padding:.85rem;text-align:center;border:1px dashed var(--border);border-radius:var(--radius);font-size:var(--text-xs);color:var(--fg-muted)")}>No AI output is waiting for review.</div>}
        </div>
      </section>}

      {/* brand system */}
      {activeTab === "brand" && <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden")}>
        <div style={css("display:flex;align-items:center;gap:0.6rem;padding:1rem 1.4rem;border-bottom:1px solid var(--border-soft)")}>
          <span style={css("width:2.1rem;height:2.1rem;border-radius:0.55rem;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0")}><Icon name="palette" size={15} /></span>
          <div style={{ flex: 1, minWidth: 0 }}><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Brand system</h3><div style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>{name} · colours, type and voice</div></div>
        </div>
        <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))") + ";gap:0.9rem;padding:1.1rem 1.4rem 1.4rem")}>
          <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt);padding:var(--space-4)")}>
            <div style={css("font-size:var(--text-2xs);letter-spacing:0;color:var(--fg-faint);font-weight:500;margin-bottom:0.85rem")}>Colours</div>
            <div style={css("display:flex;flex-direction:column;gap:var(--space-2)")}>
              {sys.colors.map(([cn, hex]) => (
                <div key={hex} style={css("display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.65rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface);min-width:0")}>
                  <span style={css("width:2.2rem;height:2.2rem;border-radius:0.55rem;flex-shrink:0;background:" + hex + ";border:1px solid oklch(0 0 0 / 0.1)")} />
                  <div style={{ minWidth: 0 }}><div style={css("font-weight:500;font-size:var(--text-sm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{cn}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-faint);font-family:'Courier New',monospace")}>{hex.toUpperCase()}</div></div>
                </div>
              ))}
              {!sys.colors.length && <div style={css("font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}>Run a Brand Audit to capture verified colours from this client’s website.</div>}
            </div>
          </div>
          <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt);padding:var(--space-4)")}>
            <div style={css("font-size:var(--text-2xs);letter-spacing:0;color:var(--fg-faint);font-weight:500;margin-bottom:0.85rem")}>Typography</div>
            <div style={css("display:flex;flex-direction:column;gap:0.55rem")}>
              {sys.fonts.map(([fn, frole, ff]) => (
                <div key={fn} style={css("display:flex;align-items:center;gap:0.9rem;padding:0.65rem 0.9rem;border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface)")}>
                  <span style={{ fontFamily: ff, fontSize: "1.5rem", lineHeight: 1, color: "var(--fg)", flexShrink: 0, width: "3rem", height: "3rem", borderRadius: "50%", border: "1px solid var(--border-soft)", display: "grid", placeItems: "center" }}>Aa</span>
                  <div style={{ minWidth: 0 }}><div style={{ fontWeight: 500, fontSize: "0.92rem", fontFamily: ff }}>{fn}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>{frole}</div></div>
                </div>
              ))}
              {!sys.fonts.length && <div style={css("font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}>No verified typography has been saved yet.</div>}
            </div>
          </div>
          <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius);background:var(--surface-alt);padding:var(--space-4)")}>
            <div style={css("font-size:var(--text-2xs);letter-spacing:0;color:var(--fg-faint);font-weight:500;margin-bottom:0.85rem")}>Brand Tone</div>
            <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:1.15rem")}>
              {toneTraits.map(t => <span key={t} style={{ fontSize: "0.74rem", fontWeight: 500, padding: "0.3rem 0.75rem", borderRadius: "999px", background: secondary + "22", color: "var(--fg)", border: "1px solid " + secondary + "66" }}>{t}</span>)}
              {!toneTraits.length && <span style={css("font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}>No approved voice traits have been saved yet.</span>}
            </div>
            {toneAvoid && <div style={css("margin:-0.35rem 0 0.85rem;font-size:var(--text-2xs);line-height:1.5;color:var(--fg-muted)")}><strong style={css("font-weight:600;color:var(--danger)")}>Avoid:</strong> {toneAvoid}</div>}
            <div style={css("display:flex;flex-direction:column;gap:0.8rem")}>
              {sys.tone.scales.map(([l, r, pct]) => (
                <div key={l}>
                  <div style={css("display:flex;justify-content:space-between;font-size:var(--text-2xs);color:var(--fg-faint);margin-bottom:0.32rem")}><span>{l}</span><span>{r}</span></div>
                  <div style={css("position:relative;height:0.4rem;border-radius:999px;background:var(--surface);border:1px solid var(--border-soft)")}><span style={{ position: "absolute", top: "50%", left: pct + "%", width: "0.9rem", height: "0.9rem", borderRadius: "50%", transform: "translate(-50%,-50%)", background: secondary, boxShadow: "0 0 0 3px var(--surface),0 1px 2px rgba(0,0,0,0.25)" }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>}

      {/* files */}
      {activeTab === "files" && <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);overflow:hidden;display:grid;grid-template-columns:" + (state.isMobile ? "1fr" : "15rem 1fr") + ";min-height:16rem")}>
        <aside style={css("border-right:1px solid var(--border-soft);background:var(--surface-alt);padding:1.1rem 0.9rem;display:flex;flex-direction:column;gap:0.15rem")}>
          <div style={css("font-size:var(--text-2xs);letter-spacing:0;color:var(--fg-faint);font-weight:500;padding:0 0.3rem 0.5rem")}>Folders</div>
          {FOLDERS.map(([label, count], fi) => (
            <div key={label} className="pt-menuitem" style={css("display:flex;align-items:center;gap:0.55rem;padding:0.5rem 0.55rem;border-radius:var(--radius);cursor:pointer;font-size:var(--text-base);font-weight:500;color:var(--fg);" + (fi === 0 ? "background:var(--surface)" : ""))}>
              <span style={{ display: "grid", placeItems: "center", flexShrink: 0, color: "var(--fg-muted)" }}><Icon name="folder" size={16} /></span>
              <span style={css("flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{label}</span>
              <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{count}</span>
            </div>
          ))}
        </aside>
        <div style={css("display:flex;flex-direction:column;min-width:0")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);padding:1rem 1.4rem;border-bottom:1px solid var(--border-soft)")}>
            <span style={css("font-weight:500;font-size:var(--text-lg)")}>Design Files</span>
            <div style={css("display:flex;gap:1.2rem;font-size:var(--text-2xs);color:var(--fg-muted)")}><span><strong style={css("color:var(--fg);font-weight:500")}>{allFiles.length}</strong> ready</span></div>
          </div>
          <div>
            <div style={css("display:grid;grid-template-columns:2.6fr 1.1fr 0.7fr 0.9fr;gap:0.7rem;padding:0.55rem 1.4rem;border-bottom:1px solid var(--border-soft);font-size:var(--text-2xs);letter-spacing:0;color:var(--fg-faint);font-weight:500")}>
              <span>Name</span><span>Project</span><span>Updated</span><span style={{ textAlign: "right" }}>Status</span>
            </div>
            {allFiles.map((f, index) => (
              <div key={f.name + "#" + index} className="pt-row" style={css("display:grid;grid-template-columns:2.6fr 1.1fr 0.7fr 0.9fr;gap:0.7rem;padding:0.75rem 1.4rem;border-bottom:1px solid var(--border-soft);align-items:center")}>
                <div style={css("display:flex;align-items:center;gap:0.65rem;min-width:0")}>
                  <span style={css("width:2rem;height:2rem;border-radius:var(--radius-sm);background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0;font-size:var(--text-2xs);font-weight:500")}>{f.ext}</span>
                  <div style={{ minWidth: 0 }}><div style={css("font-weight:500;font-size:var(--text-base);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{f.name}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-faint);white-space:nowrap")}>{f.size} · {f.by}</div></div>
                </div>
                <span style={css("font-size:var(--text-sm);color:var(--fg-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{f.project}</span>
                <span style={css("font-size:var(--text-sm);color:var(--fg-muted)")}>{f.updated}</span>
                <span style={{ justifySelf: "end", ...css(f.status === "Ready" ? "display:inline-flex;align-items:center;font-size:var(--text-2xs);font-weight:500;padding:0.16rem 0.5rem;border-radius:999px;background:var(--success-soft);color:var(--success)" : "display:inline-flex;align-items:center;font-size:var(--text-2xs);font-weight:500;padding:0.16rem 0.5rem;border-radius:999px;background:var(--accent-soft);color:var(--accent)") }}>{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>}
      {inviteOpen && (
        <div onClick={() => setInviteOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(18, 14, 11, 0.28)", zIndex: 120, display: "grid", placeItems: "center", padding: "1rem" }}>
          <div onClick={event => event.stopPropagation()} style={css("width:min(26rem,100%);border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3)")}>
            <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3)")}>
              <div>
                <div style={css("font-size:var(--text-lg);font-weight:500;color:var(--fg)")}>Add collaborator</div>
                <div style={css("font-size:var(--text-xs);color:var(--fg-muted);margin-top:0.12rem")}>{name} workspace access</div>
              </div>
              <button type="button" onClick={() => setInviteOpen(false)} className="pt-iconbtn" style={css("width:1.9rem;height:1.9rem;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--fg-muted);cursor:pointer;display:grid;place-items:center")}><Icon name="x" size={14} /></button>
            </div>
            <input value={inviteName} onChange={event => setInviteName(event.target.value)} placeholder="Collaborator name" style={css("height:2.5rem;border:1px solid var(--border);border-radius:var(--radius);padding:0 0.8rem;font-size:var(--text-base);background:var(--surface-alt);color:var(--fg)")} />
            <input value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="name@example.com" style={css("height:2.5rem;border:1px solid var(--border);border-radius:var(--radius);padding:0 0.8rem;font-size:var(--text-base);background:var(--surface-alt);color:var(--fg)")} />
            <select value={inviteAccess} onChange={event => setInviteAccess(event.target.value)} style={css("height:2.5rem;border:1px solid var(--border);border-radius:var(--radius);padding:0 0.8rem;font-size:var(--text-base);background:var(--surface-alt);color:var(--fg)")}>
              <option>Client</option>
              <option>Collaborator</option>
              <option>Reviewer</option>
            </select>
            <div style={css("display:flex;justify-content:flex-end;gap:0.55rem")}>
              <button type="button" onClick={() => setInviteOpen(false)} className="pt-softbtn" style={css("height:2.2rem;padding:0 0.9rem;border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer")}>Cancel</button>
              <button
                type="button"
                onClick={() => {
                  actions.inviteCollaborator(name, { name: inviteName, email: inviteEmail, access: inviteAccess });
                  setInviteName("");
                  setInviteEmail("");
                  setInviteAccess("Client");
                  setInviteOpen(false);
                }}
                className="pt-op"
                style={css("height:2.2rem;padding:0 1rem;border:none;border-radius:var(--radius-pill);background:var(--accent);color:#fff;font-size:var(--text-xs);font-weight:500;cursor:pointer")}
              >
                Save invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
