export type WebsiteAuditQuestionKind = "text" | "textarea" | "choice" | "checklist";

export interface WebsiteAuditDiscoveryQuestion {
  id: string;
  s: number;
  kind: WebsiteAuditQuestionKind;
  required?: boolean;
  prompt: string;
  placeholder?: string;
  help?: string;
  options?: string[];
}

export const WEBSITE_AUDIT_DISCOVERY_SECTIONS = ["Business & brand", "Audience & offer", "Goals & conversion", "Site & messaging", "Assets & priorities"] as const;

export const WEBSITE_AUDIT_DISCOVERY_QUESTIONS: WebsiteAuditDiscoveryQuestion[] = [
  { id: "business", s: 0, kind: "text", required: true, prompt: "What's the business called?", placeholder: "Client business name" },
  { id: "offer", s: 0, kind: "text", required: true, prompt: "What's the core offer we're auditing?", placeholder: "12-week 1:1 nutrition coaching" },
  { id: "positioning", s: 0, kind: "textarea", required: true, prompt: "How does the brand describe itself today?", placeholder: "A warm, grounded wellness brand that helps busy women feel in control again." },
  { id: "shift", s: 0, kind: "textarea", prompt: "What feels outdated, unclear, or in need of a shift?", placeholder: "The visuals feel DIY and the messaging no longer matches the premium level of the offer." },
  { id: "audience", s: 1, kind: "textarea", required: true, prompt: "Who's the primary audience this site should connect with?", placeholder: "Busy working moms in their 30s and 40s who want structure without all-or-nothing dieting." },
  { id: "fit", s: 1, kind: "textarea", prompt: "What makes someone a strong-fit client?", placeholder: "Ready to invest, values accountability, and wants practical guidance." },
  { id: "offerFocus", s: 1, kind: "choice", required: true, prompt: "Which part of the offer should discovery focus on most?", options: ["Core service offer", "Signature program", "Overall brand direction", "Lead magnet or nurture path", "Sales page / conversion flow"] },
  { id: "pain", s: 1, kind: "textarea", required: true, prompt: "What are the biggest hesitations, frustrations, or objections this audience has?", placeholder: "They feel overwhelmed, skeptical, and unsure what makes this brand different enough to trust." },
  { id: "goal", s: 2, kind: "choice", required: true, prompt: "What's the main business goal behind this audit?", options: ["More booked calls", "More qualified leads", "More sales", "Clearer positioning", "Better website conversion"] },
  { id: "cta", s: 2, kind: "choice", required: true, prompt: "What's the main action the site should drive?", options: ["Book a call", "Submit an inquiry", "Join the email list", "Purchase now", "Explore services"] },
  { id: "blockers", s: 2, kind: "textarea", required: true, prompt: "What seems to be blocking conversion right now?", placeholder: "The offer is buried, the CTA feels passive, and there isn't enough trust near the decision point." },
  { id: "traffic", s: 2, kind: "checklist", prompt: "Where is most traffic coming from right now?", options: ["Instagram", "Meta ads", "Google / search", "Referrals", "Email list", "Pinterest", "Direct / word of mouth", "Other"] },
  { id: "surfaces", s: 3, kind: "checklist", required: true, prompt: "Which surfaces matter most in this audit?", options: ["Homepage", "Services / offers", "About page", "Booking / inquiry flow", "Lead magnet or opt-in", "Mobile experience", "Brand visuals", "Messaging / copy"] },
  { id: "messageGap", s: 3, kind: "textarea", required: true, prompt: "What feels off in the current messaging or user experience?", placeholder: "The value prop takes too long to land and the experience feels inconsistent page to page." },
  { id: "proof", s: 3, kind: "textarea", prompt: "What proof, results, or credibility signals already exist?", placeholder: "Client testimonials, results snapshots, before/afters, media features, repeat client referrals." },
  { id: "voice", s: 3, kind: "checklist", prompt: "How should the refreshed direction feel?", options: ["Warm", "Premium", "Grounded", "Direct", "Editorial", "Authority-led", "Playful", "Minimal"] },
  { id: "assets", s: 4, kind: "textarea", prompt: "What source materials should discovery pull from?", placeholder: "Current site, Figma file, testimonials, intake notes, analytics snapshots, offer docs." },
  { id: "nonNegotiables", s: 4, kind: "textarea", prompt: "Any non-negotiables or constraints for the recommendation?", placeholder: "Keep the logo, avoid a full rebrand promise for now, stay inside the current stack if possible." },
  { id: "priorities", s: 4, kind: "checklist", required: true, prompt: "Which themes should the audit prioritize first?", options: ["Positioning clarity", "Offer clarity", "Trust & proof", "Conversion path", "Mobile UX", "Visual polish", "Content hierarchy", "SEO / findability"] },
  { id: "timeline", s: 4, kind: "choice", prompt: "How quickly should the next move happen?", options: ["ASAP / this week", "2-4 weeks", "1-2 months", "Flexible"] },
];
