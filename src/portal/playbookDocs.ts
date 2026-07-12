import type { Service } from "./types";

export interface PlaybookDocSection {
  title: string;
  body: string;
  bullets: string[];
}

export interface PlaybookDoc {
  id: string;
  page: Service;
  title: string;
  kicker: string;
  summary: string;
  sourceFiles: string[];
  sections: PlaybookDocSection[];
}

export interface PlaybookPage {
  id: Service;
  label: string;
  summary: string;
}

export const PLAYBOOK_PAGES: PlaybookPage[] = [
  {
    id: "cocoon",
    label: "Cocoon Consult",
    summary: "Audit, guided consult, and strategy-to-proposal handoff."
  },
  {
    id: "wiaw",
    label: "Winged In A Week",
    summary: "Implementation sprint, gates, launch, and client handoff."
  },
  {
    id: "iff",
    label: "In Full Flight",
    summary: "Ongoing care, chat-to-edit requests, and retained execution."
  }
];

export const PLAYBOOK_DOCS: PlaybookDoc[] = [
  {
    id: "cocoon-audit",
    page: "cocoon",
    title: "Cocoon Consult - Audit",
    kicker: "Diagnostic workflow",
    summary: "How intake, website review, AI passes, and human review become a client-safe audit.",
    sourceFiles: ["AUDIT_WORKFLOW.md", "BALTZ_SERVICE_WORKFLOW_MAP.md"],
    sections: [
      {
        title: "Function",
        body: "This playbook governs the diagnostic part of Cocoon Consult. It keeps every audit tied to the same intake, checklist, review, and client-safe delivery rules.",
        bullets: [
          "Use the canonical Cocoon Consult audit categories before writing client-facing findings.",
          "Run intake and website review before any summary or recommendation is treated as ready.",
          "Use human review to resolve weak or conflicting AI findings."
        ]
      },
      {
        title: "Output",
        body: "The audit should produce a structured dashboard record, not a loose opinion document.",
        bullets: [
          "Completed checks are separated from visible action items.",
          "Findings explain what was observed, why it matters, and what action is recommended.",
          "Results can feed the guided consult, proposal, or implementation plan."
        ]
      }
    ]
  },
  {
    id: "cocoon-proposal",
    page: "cocoon",
    title: "Cocoon Consult - Proposal",
    kicker: "Scope handoff",
    summary: "How audit priorities become a scoped consult plan, Winged in a Week proposal, or another next-step recommendation.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md", "AUDIT_WORKFLOW.md"],
    sections: [
      {
        title: "Function",
        body: "This playbook translates Cocoon Consult findings into the next commercial or delivery step without skipping the strategy layer.",
        bullets: [
          "Start from approved audit findings and readiness signals.",
          "Separate consult guidance from implementation scope.",
          "Recommend Winged in a Week only when the audit backs a build path."
        ]
      },
      {
        title: "Proposal inputs",
        body: "The proposal should be specific to the workflow gap the audit uncovered.",
        bullets: [
          "Name the client problem, service path, and required next action.",
          "Map proposal line items to audit priorities or strategy handoff needs.",
          "Keep Wise/payment automation language draft-only until approved."
        ]
      }
    ]
  },
  {
    id: "cocoon-guided-call",
    page: "cocoon",
    title: "Cocoon Consult - Guided Call",
    kicker: "Paid consult delivery",
    summary: "How payment, booking, dashboard access, and the 24-hour guidance window work around the consult.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md", "BALTZ_DASHBOARD_WORKFLOW_ALIGNMENT_TASKS.md"],
    sections: [
      {
        title: "Function",
        body: "This playbook governs the paid guided call after the audit results are ready.",
        bullets: [
          "Payment unlocks booking, three-month dashboard access, and a 24-hour guidance window.",
          "The guided call turns the audit into a workflow, dashboard path, booking link, funnel, or build plan.",
          "If the client returns after access ends, the old audit should not drive a new build without a fresh Cocoon Consult."
        ]
      }
    ]
  },
  {
    id: "wiaw-implementation",
    page: "wiaw",
    title: "Winged In A Week - Implementation",
    kicker: "Build sprint",
    summary: "How an approved Cocoon Consult strategy becomes foundation, design, build, QA, launch, and handoff.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md", "BALTZ_DASHBOARD_WORKFLOW_ALIGNMENT_TASKS.md"],
    sections: [
      {
        title: "Function",
        body: "This playbook governs the implementation sprint after Cocoon Consult has clarified the right strategy.",
        bullets: [
          "Begin with access, assets, audit notes, and setup.",
          "Move through strategy, sitemap, copy, design, and build.",
          "Finish with launch prep, handoff package, and project completion."
        ]
      }
    ]
  },
  {
    id: "wiaw-gates",
    page: "wiaw",
    title: "Winged In A Week - Review Gates",
    kicker: "Client decisions",
    summary: "How design preview, full-site review, and launch handoff gates should function inside the dashboard.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md", "BALTZ_DASHBOARD_WORKFLOW_ALIGNMENT_TASKS.md"],
    sections: [
      {
        title: "Function",
        body: "This playbook keeps Winged in a Week decisions explicit so the sprint does not blur into open-ended revision work.",
        bullets: [
          "Gate 1 confirms the design direction.",
          "Gate 2 confirms the full-site preview.",
          "Gate 3 confirms handoff and launch readiness."
        ]
      }
    ]
  },
  {
    id: "wiaw-handoff",
    page: "wiaw",
    title: "Winged In A Week - Handoff",
    kicker: "Launch closeout",
    summary: "How launch prep, ownership transfer, training, and continuation into IFF are handled.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md"],
    sections: [
      {
        title: "Function",
        body: "This playbook defines what counts as complete at the end of Winged in a Week.",
        bullets: [
          "Confirm DNS, SSL, analytics, and production launch status.",
          "Send the handoff package and training walkthrough.",
          "Route the client into In Full Flight or the post-project nurture path."
        ]
      }
    ]
  },
  {
    id: "iff-chat-to-edit",
    page: "iff",
    title: "In Full Flight - Chat-to-edit care",
    kicker: "Client request workflow",
    summary: "How retained clients request edits by chat, review preview links, and approve changes with scope boundaries.",
    sourceFiles: ["BALTZ_CLIENT_CHAT_PREVIEW_MVP.md", "BALTZ_SERVICE_WORKFLOW_MAP.md"],
    sections: [
      {
        title: "Function",
        body: "This playbook governs the chat-to-edit product model for In Full Flight clients.",
        bullets: [
          "Clients request website edits through chat instead of editing the CMS directly.",
          "The studio prepares a preview link before changes go live.",
          "Approval, revision, and scope boundaries stay visible in the request flow."
        ]
      }
    ]
  },
  {
    id: "iff-retainer-upkeep",
    page: "iff",
    title: "In Full Flight - Monthly upkeep",
    kicker: "Retained execution",
    summary: "How ongoing maintenance, content updates, reporting, experiments, and care requests are handled.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md"],
    sections: [
      {
        title: "Function",
        body: "This playbook defines the recurring care layer after a launch or handoff.",
        bullets: [
          "Track maintenance, content updates, optimization, and reporting.",
          "Keep requests connected to the existing client project context.",
          "Escalate scope changes instead of absorbing them into recurring work silently."
        ]
      }
    ]
  },
  {
    id: "iff-access-end",
    page: "iff",
    title: "In Full Flight - Nurture and access end",
    kicker: "Lifecycle closeout",
    summary: "How access, follow-up, pauses, and dashboard deletion work when a client does not continue.",
    sourceFiles: ["BALTZ_SERVICE_WORKFLOW_MAP.md", "BALTZ_DASHBOARD_WORKFLOW_ALIGNMENT_TASKS.md"],
    sections: [
      {
        title: "Function",
        body: "This playbook keeps the end of access clear so old audits and stale dashboards do not drive future strategy.",
        bullets: [
          "Use nurture emails when a client does not continue after Cocoon Consult or Winged in a Week.",
          "Delete access after the approved no-action window.",
          "Require a new paid Cocoon Consult before restarting later."
        ]
      }
    ]
  }
];

export function findPlaybookDoc(id: string | null | undefined) {
  if (!id) return null;
  return PLAYBOOK_DOCS.find(doc => doc.id === id) ?? null;
}

export function playbookDocsForPage(page: Service) {
  return PLAYBOOK_DOCS.filter(doc => doc.page === page);
}
