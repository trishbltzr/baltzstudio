// Funnel builder data — ported from the "Funnel Builder" handoff design.
// Sections → questions → per-section sign-off gate → generated deliverables.

export type QKind = "text" | "textarea" | "choice" | "checklist";
export interface FQuestion {
  id: string;
  s: number;               // section index
  kind: QKind;
  required?: boolean;
  prompt: string;
  placeholder?: string;
  help?: string;
  options?: string[];
}
export interface FDeliv {
  id: string;
  title: string;
  from: string;
  intro: string;
  terminal?: boolean;
}

export const SECTIONS = ["Business & offer", "Audience & awareness", "Goal & distribution", "Brand & logistics", "Expansion"];

export const DELIVS: FDeliv[] = [
  { id: "flow", title: "Funnel Flow", from: "your intake", intro: "The journey from first useful touch to a high-intent action — how demand is created, then captured. Approve it and we'll build the persona on top." },
  { id: "persona", title: "Customer Persona", from: "the funnel flow", intro: "Who we're really building for. Generated from your audience answers — this shapes every word of copy." },
  { id: "copy", title: "Copy & Messaging", from: "the persona", intro: "Implementation-ready copy for every section of the page — written to the persona above. A brief your developer can build from." },
  { id: "wireframe", title: "Skeleton Wireframe", from: "the copy", intro: "Your landing page with the real copy dropped into each section — a preview of how the final page reads, top to bottom." },
  { id: "devplan", title: "Development Plan", from: "the skeleton wireframe", intro: "The technical build — pages, sections, integrations and stack that deliver this copy." },
  { id: "timeline", title: "Timeline & Budget", from: "the development plan", intro: "How long it takes and what it costs, based on the scope above." },
  { id: "finalplan", title: "Final Plan", from: "everything approved", intro: "Every piece signed off. This is the consolidated plan our team builds from.", terminal: true },
];

export const QUESTIONS: FQuestion[] = [
  { id: "company", s: 0, kind: "text", required: true, prompt: "What's your business called?", placeholder: "Baltz Studio" },
  { id: "sell", s: 0, kind: "text", required: true, prompt: "In one line, what do you sell?", placeholder: "12-week nutrition coaching", help: "The paid thing you ultimately want people to buy." },
  { id: "leadMagnet", s: 0, kind: "text", required: true, prompt: "What do you give away free — no email wall?", placeholder: "7-day meal-prep guide, published openly", help: "The ungated value that earns trust before you ask for anything." },
  { id: "price", s: 0, kind: "text", prompt: "Your main paid offer and its price?", placeholder: "$1,200 12-week program" },
  { id: "promise", s: 0, kind: "textarea", required: true, prompt: "What's the core promise — the transformation?", placeholder: "Lose the first 10 lbs in 30 days without giving up carbs." },
  { id: "mechanism", s: 0, kind: "textarea", prompt: "What's your point of view — the idea you'll be known for?", placeholder: "Nutrition works when it's built around your existing takeout habits, not against them.", help: "Your category thesis / unique mechanism." },

  { id: "audience", s: 1, kind: "textarea", required: true, prompt: "Who's the ideal person you're building demand with?", placeholder: "Working moms, 30–45, tried every diet, no time to cook." },
  { id: "pains", s: 1, kind: "textarea", required: true, prompt: "Their top 2–3 frustrations right now?", placeholder: "Exhausted, guilty about takeout, nothing has stuck." },
  { id: "desires", s: 1, kind: "textarea", prompt: "What do they most want instead?", placeholder: "To feel in control of food without it running their life." },
  { id: "objections", s: 1, kind: "textarea", prompt: "What makes them hesitate?", placeholder: "“I've tried things before and they didn't work.”" },
  { id: "awareness", s: 1, kind: "choice", prompt: "How aware are they of solutions like yours?", options: ["Brand new to the problem", "Feel the problem", "Know solutions exist", "Comparing options", "Ready to buy"] },

  { id: "primaryAction", s: 2, kind: "choice", required: true, prompt: "When someone's ready, what's the ONE high-intent action?", options: ["Talk to us / book a call", "See it live / demo", "Start free", "Read the resource", "Join the community"], help: "For the ~5% in-market now — not an email opt-in." },
  { id: "afterOptin", s: 2, kind: "choice", prompt: "What happens right after they engage?", options: ["Point to more useful content", "Show a booking calendar", "Invite to the community / newsletter", "Send them to the hub"] },
  { id: "goodLead", s: 2, kind: "textarea", prompt: "What does a GOOD fit look like?", placeholder: "Someone who can afford the program and is ready to start now." },
  { id: "traffic", s: 2, kind: "checklist", prompt: "Where does your audience already spend time?", options: ["LinkedIn", "YouTube", "Podcast", "Communities", "Newsletter", "SEO / content", "Paid (amplify)"] },
  { id: "trafficTemp", s: 2, kind: "choice", prompt: "How warm is that audience already?", options: ["Mostly cold", "A mix", "Mostly warm"] },

  { id: "tone", s: 3, kind: "checklist", prompt: "How should the copy sound?", options: ["Friendly", "Authoritative", "Bold / edgy", "Warm / empathetic", "Playful", "Premium", "Straight-talking"] },
  { id: "proof", s: 3, kind: "textarea", required: true, prompt: "What proof can we use? Results, testimonials, numbers.", placeholder: "Summarize the proof currently available." },
  { id: "guarantee", s: 3, kind: "text", prompt: "Any guarantee or risk-reversal?", placeholder: "30-day money-back guarantee" },
  { id: "colors", s: 3, kind: "text", prompt: "Brand colors — hex codes if you have them?", placeholder: "#26201B, #C97A6D, #EDE6DA" },
  { id: "esp", s: 3, kind: "choice", prompt: "Which email tool should the audience flow into?", options: ["Mailchimp", "Kit (ConvertKit)", "ActiveCampaign", "GoHighLevel", "Klaviyo", "HubSpot", "None yet"] },
  { id: "calendar", s: 3, kind: "choice", prompt: "Booking / calendar tool?", options: ["Calendly", "Acuity", "GoHighLevel", "SavvyCal", "None"] },
  { id: "domain", s: 3, kind: "text", prompt: "What domain should the funnel live on?", placeholder: "get.yourstudio.com" },
  { id: "deadline", s: 3, kind: "choice", prompt: "When do you need it live?", options: ["ASAP / this week", "2–4 weeks", "1–2 months", "Flexible"] },
  { id: "budget", s: 3, kind: "choice", prompt: "Ballpark budget for the build?", options: ["Under $2k", "$2k–$5k", "$5k–$10k", "$10k+", "Not sure"] },

  { id: "hasUpsell", s: 4, kind: "choice", required: true, prompt: "Do you have a way to expand value after they buy?", options: ["Yes — I have one ready", "Not yet — suggest one for me", "No, not for now"], help: "An expansion or next-step offer that grows the relationship — not a one-time upsell trick." },
  { id: "upsellOffer", s: 4, kind: "text", prompt: "What's the expansion / next step? One line.", placeholder: "Done-for-you meal plans — 12-week add-on", help: "The next-step offer they can add later." },
  { id: "upsellPrice", s: 4, kind: "text", prompt: "Expansion price (optional)?", placeholder: "$97" },
];

export const DEMO: Record<string, string | string[]> = {};

export const TYPE_LABEL: Record<string, string> = {
  text: "Short answer", textarea: "Long answer", choice: "Pick one", checklist: "Pick any that apply",
};

// ── Flow model: welcome → (questions + gate) per section → deliverables ───────
export type FlowStep =
  | { kind: "welcome" }
  | { kind: "section"; sIdx: number; questions: FQuestion[] }
  | { kind: "gate"; sIdx: number }
  | { kind: "deliv"; dId: string };

export function buildFlow(): FlowStep[] {
  const flow: FlowStep[] = [{ kind: "welcome" }];
  SECTIONS.forEach((_, si) => {
    const qs = QUESTIONS.filter(q => q.s === si);
    flow.push({ kind: "section", sIdx: si, questions: qs });
    flow.push({ kind: "gate", sIdx: si });
  });
  DELIVS.forEach(d => flow.push({ kind: "deliv", dId: d.id }));
  return flow;
}
