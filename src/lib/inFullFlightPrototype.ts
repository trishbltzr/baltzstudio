export type InFullFlightWorkspace = {
  slug: string;
  clientName: string;
  siteName: string;
  supportTier: string;
  launchDate: string;
  liveUrl: string;
  revisionPolicy: string;
  autoPreviewRule: string;
  allowedEdits: string[];
  pushbackRules: string[];
};

export type PrototypeDecision = "accepted" | "needs_clarification" | "out_of_scope" | "new_revision_round";

export type PrototypeSnapshot = {
  id: string;
  label: string;
  stageLabel: string;
  changeSummary: string;
  pageTitle: string;
  eyebrow: string;
  headline: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
  announcement: string;
  proofItems: string[];
  testimonials?: Array<{ quote: string; name: string; role: string }>;
};

export type PrototypePlan = {
  decision: PrototypeDecision;
  summary: string;
  assistantReply: string;
  previewSnapshotId?: string;
};

const WORKSPACES: Record<string, InFullFlightWorkspace> = {
  "flora-and-co": {
    slug: "flora-and-co",
    clientName: "Flora & Co.",
    siteName: "Flora & Co. Studio",
    supportTier: "In Full Flight Hypercare",
    launchDate: "May 12, 2026",
    liveUrl: "flora-and-co.example",
    revisionPolicy: "Fast content edits and light layout refinements are in scope. Bigger repositioning opens a new studio round.",
    autoPreviewRule: "Copy, images, testimonials, banners, and section order can auto-preview. Structural redesign requests pause for studio review.",
    allowedEdits: [
      "Homepage and announcement copy updates",
      "Image swaps for approved sections",
      "Testimonial, FAQ, and service card refreshes",
      "Light section reordering inside approved page templates",
    ],
    pushbackRules: [
      "Whole-site redesign requests become a separate scope",
      "Brand repositioning needs studio review before preview",
      "Post-approval structural changes open a new round",
    ],
  },
};

const SNAPSHOTS: Record<string, PrototypeSnapshot> = {
  "weekly-offer-refresh": {
    id: "weekly-offer-refresh",
    label: "Weekly offer refresh",
    stageLabel: "Preview ready",
    changeSummary: "Updated the announcement banner and warmed the hero copy to support this week's offer.",
    pageTitle: "Flora & Co. Studio",
    eyebrow: "Small-batch floral styling for intimate events",
    headline: "Elegant florals, now paired with this week's complimentary setup styling.",
    body: "We refreshed the homepage message to spotlight your current offer without changing the overall visual direction or site structure.",
    primaryCta: "Book the offer",
    secondaryCta: "View packages",
    announcement: "This week only: complimentary setup styling with new event bookings.",
    proofItems: ["Trusted by 120+ weddings", "48-hour response time", "Seasonal design support"],
  },
  "testimonial-insert": {
    id: "testimonial-insert",
    label: "Testimonials insert",
    stageLabel: "Preview ready",
    changeSummary: "Added an approved testimonials section above the final CTA and tightened the supporting copy.",
    pageTitle: "Flora & Co. Studio",
    eyebrow: "Refined floral work for celebrations that feel personal",
    headline: "Design support that makes the day feel effortless, not overdesigned.",
    body: "The requested social-proof section now sits before the final CTA so visitors see confidence-building quotes closer to the booking decision.",
    primaryCta: "Schedule your consult",
    secondaryCta: "Browse galleries",
    announcement: "Summer calendar now open for destination and local celebrations.",
    proofItems: ["Trusted by 120+ weddings", "Design and install handled", "Timelines coordinated with planners"],
    testimonials: [
      {
        quote: "Everything looked elevated without losing the softness we wanted.",
        name: "Nadine R.",
        role: "Wedding client",
      },
      {
        quote: "The site now sounds exactly like the calm, luxury experience clients get in person.",
        name: "Mara V.",
        role: "Brand refresh client",
      },
    ],
  },
  "hero-copy-refresh": {
    id: "hero-copy-refresh",
    label: "Hero copy refresh",
    stageLabel: "Preview ready",
    changeSummary: "Adjusted the homepage headline and supporting paragraph to feel warmer while preserving the current layout.",
    pageTitle: "Flora & Co. Studio",
    eyebrow: "Wedding florals with calm direction from first inquiry to setup",
    headline: "Warm, artful florals for celebrations that still feel like you.",
    body: "This preview softens the tone of the hero without moving sections or changing the brand direction you already approved.",
    primaryCta: "Start your floral brief",
    secondaryCta: "See past events",
    announcement: "Now booking autumn celebrations and editorial brand shoots.",
    proofItems: ["Custom palettes", "Setup and styling included", "Trusted vendor collaboration"],
  },
};

export function getPrototypeWorkspace(slug: string): InFullFlightWorkspace {
  return WORKSPACES[slug] ?? WORKSPACES["flora-and-co"];
}

export function getPrototypeSnapshot(id: string): PrototypeSnapshot {
  return SNAPSHOTS[id] ?? SNAPSHOTS["weekly-offer-refresh"];
}

export function getPrototypePreviewPath(workspaceSlug: string, snapshotId: string): string {
  return `/in-full-flight/${workspaceSlug}/preview/${snapshotId}`;
}

export function classifyPrototypeRequest(input: string): PrototypePlan {
  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    return {
      decision: "needs_clarification",
      summary: "No request content provided.",
      assistantReply: "Tell me the exact page or section you want adjusted and I can prepare the next preview.",
    };
  }

  if (
    /rebrand|redesign|entire site|whole site|start over|new visual direction|completely different/.test(normalized)
  ) {
    return {
      decision: "out_of_scope",
      summary: "Request exceeds routine In Full Flight support.",
      assistantReply:
        "I can handle ongoing edits here, but a full redesign or repositioning request needs to move into a separate studio scope before I generate a preview.",
    };
  }

  if (/homepage redesign|new homepage|different layout|move everything/.test(normalized)) {
    return {
      decision: "new_revision_round",
      summary: "Structural direction change detected.",
      assistantReply:
        "This sounds bigger than a standard post-launch update, so I would open a new revision round and flag it for studio review before previewing it.",
    };
  }

  if (/testimonial|social proof|review section|client quote/.test(normalized)) {
    return {
      decision: "accepted",
      summary: "Approved section insertion within current template.",
      assistantReply:
        "This fits your In Full Flight support scope. I can add an approved testimonials section and generate a preview for review.",
      previewSnapshotId: "testimonial-insert",
    };
  }

  if (/banner|announcement|promo|offer|sale|special/.test(normalized)) {
    return {
      decision: "accepted",
      summary: "Content-only homepage refresh.",
      assistantReply:
        "This request stays within the current homepage structure, so I'm generating a fresh preview with the updated offer messaging now.",
      previewSnapshotId: "weekly-offer-refresh",
    };
  }

  if (/headline|hero|warmer|softer|less stiff|more inviting/.test(normalized)) {
    return {
      decision: "accepted",
      summary: "Hero copy refinement within approved direction.",
      assistantReply:
        "This fits the post-launch support lane. I'll adjust the hero copy and prepare a preview without changing the page structure.",
      previewSnapshotId: "hero-copy-refresh",
    };
  }

  return {
    decision: "needs_clarification",
    summary: "Request needs a more precise target.",
    assistantReply:
      "I can help with that. Tell me the exact page, section, or message you want edited so I can decide whether it can auto-preview from here.",
  };
}
