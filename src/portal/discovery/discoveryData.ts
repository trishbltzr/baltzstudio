import type { DiscoveryStage, DiscoveryTopic, DiscoveryIntroStep } from "./DiscoveryBuilder";
import { processPipelineStages } from "../processDefinitions";

// ── Funnel discovery (ported from the Funnel Builder handoff) ──────────────────
export const FUNNEL_WIZARD: DiscoveryTopic[] = [
  { id: "you", num: "01", title: "Copy starting point", icon: "users", qs: [
    { key: "nickname", label: "What should we call you?", hint: "Your first name or nickname — we’ll use it throughout.", kind: "text", ph: "Name or nickname" },
    { key: "sourceMaterial", label: "Paste the brief or copy you want us to work from", hint: "Share the strongest available source. We’ll organize and improve it without inventing unsupported claims.", kind: "textarea", ph: "Paste your brief, existing copy, or both…" },
    { key: "rewriteDepth", label: "Based on the content you provided, how much change would you like to see in the copy and wireframe?", hint: "The section order stays fixed. This controls how much we change inside it.", kind: "single", opts: ["Polish", "Improve", "Rebuild"] },
    { key: "brandName", label: "What’s your brand or business called?", hint: "We’ll keep your name and your brand separate throughout the plan.", kind: "text", ph: "Brand or business name" },
    { key: "clientEmail", label: "Best email for updates", hint: "Where we’ll send the drafts and the final brief.", kind: "text", ph: "you@company.com" },
  ] },
  { id: "goal", num: "02", title: "Goal & journey", icon: "target", qs: [
    { key: "name", label: "Funnel name", hint: "How we’ll refer to it internally.", kind: "text", ph: "e.g. Natural pet care → community" },
    { key: "objective", label: "Primary objective", hint: "The single outcome that defines success — demand created, not contacts captured.", kind: "single", opts: ["Create qualified demand", "Educate the market", "Build an engaged audience", "Generate qualified pipeline", "Capture in-market buyers", "Launch a product"] },
    { key: "ftype", label: "Journey shape", hint: "How demand is created, then captured.", kind: "single", opts: ["Content engine → high-intent CTA", "POV → distribution → demo", "Newsletter / community → conversion", "Free-to-paid product loop", "Live / education → talk to us"] },
    { key: "pov", label: "What’s the one idea your content will be known for?", hint: "Your category thesis — the belief you’ll repeat everywhere, so the market starts to want what you offer.", kind: "text", ph: "e.g. Natural pet care is preventative, not reactive." },
    { key: "action", label: "Primary conversion action", hint: "One high-intent action for the ~5% ready to buy now — not an email opt-in.", kind: "text", ph: "e.g. Talk to us · See it live · Start free" },
  ] },
  { id: "offer", num: "03", title: "Offer & ungated value", icon: "wallet", qs: [
    { key: "offer", label: "What are you offering?", kind: "textarea", ph: "Describe the product or service you ultimately sell…" },
    { key: "ungated", label: "What will you give away free — no email wall?", hint: "The value that earns trust before you ask for anything. Gating is optional and off by default.", kind: "textarea", ph: "Guides, tools, teardowns, videos…" },
    { key: "price", label: "Price point", kind: "single", opts: ["Free — ungated value", "Under $100", "$100–$500", "$500–$2k", "$2k+", "Custom / quote"] },
    { key: "ladder", label: "Value ladder", hint: "How value builds over time.", kind: "multi", opts: ["Free value / content", "Front-end offer", "Upsell / expansion", "Referral / advocacy"] },
    { key: "proof", label: "Proof & credibility", hint: "What earns the buyer’s trust.", kind: "multi", opts: ["Testimonials", "Case studies", "Point-of-view credibility", "Community / social proof", "Money-back guarantee"] },
  ] },
  { id: "audience", num: "04", title: "Audience & distribution", icon: "users", qs: [
    { key: "persona", label: "Who is the ideal customer?", kind: "textarea", ph: "Role, situation, desire, what keeps them up at night…" },
    { key: "problem", label: "Core problem you educate them on", kind: "text", ph: "The problem your content keeps teaching" },
    { key: "traffic", label: "Distribution", hint: "Where your audience already spends time — we show up there. Paid just amplifies what’s working.", kind: "multi", opts: ["LinkedIn", "YouTube", "Podcast", "Communities", "Newsletter", "SEO / content", "Paid (amplify content)"] },
    { key: "awareness", label: "Awareness level", hint: "How much they already know — we build content for each rung.", kind: "single", opts: ["Unaware", "Problem-aware", "Solution-aware", "Product-aware", "Most aware"] },
  ] },
  { id: "pages", num: "05", title: "Funnel flow", icon: "funnel", qs: [
    { key: "pages", label: "Pages in this funnel", hint: "Pick every step. Order is handled for you.", kind: "multi", opts: ["Opt-in / landing", "Sales page", "VSL page", "Application form", "Booking / calendar", "Checkout", "Order bump", "Upsell (OTO)", "Downsell", "Thank-you"] },
    { key: "emails", label: "Follow-up & nurture", hint: "How you stay useful after they engage — nurture by value, not by pitching.", kind: "single", opts: ["None", "Value newsletter", "Content nurture (educate, don’t pitch)", "In-market signal → sales reaches out"] },
  ] },
  { id: "assets", num: "06", title: "Brand & assets", icon: "palette", qs: [
    { key: "brand", label: "Brand system", hint: "Where the look comes from.", kind: "single", opts: ["Use existing Brand System", "Client will provide", "Studio to create"] },
    { key: "copy", label: "Who writes the copy?", kind: "single", opts: ["Studio drafts", "Client provides", "Collaborative"] },
    { key: "need", label: "Assets we’ll collect", hint: "Each becomes a folder on the funnel.", kind: "multi", opts: ["Logo & brand kit", "Product photos", "Headshots / team", "POV / thesis doc", "Video / content clips", "Testimonials", "Ungated resources", "Legal / policy pages"] },
  ] },
  { id: "tech", num: "07", title: "Tech & measurement", icon: "settings", qs: [
    { key: "platform", label: "Build platform", kind: "single", opts: ["Webflow", "ClickFunnels", "Kajabi", "GoHighLevel", "WordPress", "Custom"] },
    { key: "domain", label: "Domain", kind: "text", ph: "e.g. get.brand.com" },
    { key: "email", label: "Email / CRM", kind: "single", opts: ["Not set up yet", "Mailchimp", "ConvertKit", "ActiveCampaign", "HubSpot", "GoHighLevel"] },
    { key: "payment", label: "Payments", kind: "single", opts: ["None (audience-building)", "Stripe", "PayPal", "Platform native"] },
    { key: "tracking", label: "Measurement", hint: "What tells us demand is growing — not just form fills.", kind: "multi", opts: ["Engaged & returning audience", "Branded search", "Content engagement → retargeting", "Qualified pipeline", "Google Analytics", "Meta Pixel"] },
  ] },
];

export const FUNNEL_STAGES: DiscoveryStage[] = processPipelineStages("funnel-build");

export const FUNNEL_INTRO_STEPS: DiscoveryIntroStep[] = [
  { title: "Discovery" },
  { title: "Funnel flow" },
  { title: "Copy" },
  { title: "Wireframe" },
  { title: "Development plan" },
];

// ── Audit discovery (ported from the Audit Builder handoff) ────────────────────
export const AUDIT_WIZARD: DiscoveryTopic[] = [
  { id: "you", num: "01", title: "About you", icon: "users", qs: [
    { key: "nickname", label: "What should we call you?", hint: "Your first name or nickname — we’ll use it throughout.", kind: "text", ph: "Name or nickname" },
    { key: "name", label: "Brand or business name", hint: "How the report will be titled — kept separate from your personal name.", kind: "text", ph: "Brand or business name" },
    { key: "url", label: "Website URL", kind: "text", ph: "Website URL" },
  ] },
  { id: "conv", num: "02", title: "Conversion Path", icon: "target", qs: [
    { key: "convM", label: "How clear is the primary next step on your site?", kind: "single", opts: ["No obvious action", "Buried below the fold", "One CTA, competing with others", "Clear on most pages", "One unmistakable CTA everywhere"] },
    { key: "convFriction", label: "Biggest conversion blockers", hint: "Pick anything that applies.", kind: "multi", opts: ["Long forms", "No clear CTA", "Slow checkout", "No social proof", "Too many choices"] },
  ] },
  { id: "exp", num: "03", title: "Website Experience", icon: "chart", qs: [
    { key: "expM", label: "How would you rate the browsing experience?", kind: "single", opts: ["Clunky & slow", "Works but dated", "Fine on desktop only", "Smooth on most devices", "Fast & effortless everywhere"] },
    { key: "platform", label: "What is it built on?", kind: "single", opts: ["Wix / Squarespace", "WordPress", "Webflow", "Shopify", "Custom / other"] },
  ] },
  { id: "msg", num: "04", title: "On-page messaging", icon: "msg", qs: [
    { key: "msgM", label: "How quickly does the site explain the value?", kind: "single", opts: ["Not sure we have one", "Feature-led, not outcome-led", "Clear once you read a while", "Mostly clear up top", "Instantly obvious"] },
    { key: "tone", label: "Does the website use a consistent tone?", kind: "single", opts: ["Not at all", "Loosely", "Documented guidelines"] },
  ] },
  { id: "find", num: "05", title: "Findability", icon: "eye", qs: [
    { key: "findM", label: "How is your search visibility?", kind: "single", opts: ["Invisible", "A few brand terms", "Some traffic, no strategy", "Ranking for key terms", "Strong organic engine"] },
    { key: "seo", label: "What is in place?", hint: "Select all that apply.", kind: "multi", opts: ["Title tags & meta", "Blog / content", "Backlinks", "Analytics", "Sitemap"] },
  ] },
  { id: "vis", num: "06", title: "Visual consistency", icon: "palette", qs: [
    { key: "visM", label: "How consistent does the website look page to page?", kind: "single", opts: ["All over the place", "A few recurring styles", "Consistent-ish", "Mostly systematic", "A tight design system"] },
    { key: "brandSys", label: "What visual guidance does the website follow?", kind: "single", opts: ["No", "A logo & colours", "Full guidelines"] },
  ] },
  { id: "brand", num: "07", title: "Site positioning", icon: "sparkle", qs: [
    { key: "brandM", label: "How clearly does the website communicate your position?", kind: "single", opts: ["Unclear", "We know it, it is not written", "Written but generic", "Clear & differentiated", "Owns a category in one line"] },
    { key: "diff", label: "What should the website make clear about why you are different?", kind: "textarea", ph: "In a sentence — why you over the alternatives…" },
  ] },
];

export const AUDIT_STAGES: DiscoveryStage[] = processPipelineStages("website-audit");

export const AUDIT_INTRO_STEPS: DiscoveryIntroStep[] = [
  { title: "Conversion Path", tag: "CTAs & forms", icon: "activity" },
  { title: "Website Experience", tag: "Nav & speed", icon: "eye" },
  { title: "On-page messaging", tag: "Value & clarity", icon: "msg" },
  { title: "Findability", tag: "SEO & meta", icon: "target" },
  { title: "Visual consistency", tag: "Page-to-page design", icon: "palette" },
  { title: "Site positioning", tag: "Why choose this brand", icon: "grid" },
];

export const FUNNEL_DEMO: Record<string, string | string[]> = {};
export const AUDIT_DEMO: Record<string, string | string[]> = {};
