import type { DiscoveryStage, DiscoveryTopic, DiscoveryIntroStep } from "./DiscoveryBuilder";

// ── Funnel discovery (ported from the Funnel Builder handoff) ──────────────────
export const FUNNEL_WIZARD: DiscoveryTopic[] = [
  { id: "you", num: "01", title: "About you", icon: "users", qs: [
    { key: "nickname", label: "What should we call you?", hint: "Your first name or nickname — we’ll use it throughout.", kind: "text", ph: "Name or nickname" },
    { key: "brandName", label: "What’s your brand or business called?", hint: "We’ll keep your name and your brand separate throughout the plan.", kind: "text", ph: "Brand or business name" },
    { key: "clientEmail", label: "Best email for updates", hint: "Where we’ll send the drafts and the final brief.", kind: "text", ph: "you@company.com" },
  ] },
  { id: "goal", num: "02", title: "Goal & funnel type", icon: "target", qs: [
    { key: "name", label: "Funnel name", hint: "How we’ll refer to it internally.", kind: "text", ph: "e.g. Free Audit → Consult" },
    { key: "objective", label: "Primary objective", hint: "The single outcome that defines success.", kind: "single", opts: ["Generate leads", "Sell a product", "Book calls / applications", "Webinar registrations", "Build a waitlist", "Launch a product"] },
    { key: "ftype", label: "Funnel type", hint: "The shape of the journey.", kind: "single", opts: ["Lead magnet → nurture", "Sales page → checkout", "VSL → checkout", "Webinar → offer", "Application → call", "Tripwire → upsell"] },
    { key: "action", label: "Primary conversion action", hint: "The one thing a visitor should do.", kind: "text", ph: "e.g. Book a free strategy call" },
  ] },
  { id: "offer", num: "03", title: "The offer", icon: "wallet", qs: [
    { key: "offer", label: "What are you offering?", kind: "textarea", ph: "Describe the product, service or lead magnet…" },
    { key: "price", label: "Price point", kind: "single", opts: ["Free (lead gen)", "Under $100", "$100–$500", "$500–$2k", "$2k+", "Custom / quote"] },
    { key: "ladder", label: "Offer ladder", hint: "Select everything in play.", kind: "multi", opts: ["Front-end offer", "Order bump", "Upsell (OTO)", "Downsell", "Cross-sell"] },
    { key: "proof", label: "Risk reversal & proof", hint: "What lowers the buyer’s risk.", kind: "multi", opts: ["Money-back guarantee", "Testimonials", "Case studies", "Scarcity / deadline", "Bonus stack"] },
  ] },
  { id: "audience", num: "04", title: "Audience & traffic", icon: "users", qs: [
    { key: "persona", label: "Who is the ideal customer?", kind: "textarea", ph: "Role, situation, desire, what keeps them up at night…" },
    { key: "problem", label: "Core problem you solve", kind: "text", ph: "The pain that pulls them in" },
    { key: "traffic", label: "Traffic sources", hint: "Where visitors come from.", kind: "multi", opts: ["Paid ads (Meta)", "Paid ads (Google)", "Email list", "Organic social", "SEO / blog", "Partners / affiliates"] },
    { key: "awareness", label: "Awareness level", hint: "How much they already know.", kind: "single", opts: ["Unaware", "Problem-aware", "Solution-aware", "Product-aware", "Most aware"] },
  ] },
  { id: "pages", num: "05", title: "Funnel flow", icon: "funnel", qs: [
    { key: "pages", label: "Pages in this funnel", hint: "Pick every step. Order is handled for you.", kind: "multi", opts: ["Opt-in / landing", "Sales page", "VSL page", "Application form", "Booking / calendar", "Checkout", "Order bump", "Upsell (OTO)", "Downsell", "Thank-you"] },
    { key: "emails", label: "Email follow-up", hint: "What happens after they convert.", kind: "single", opts: ["None", "Welcome + delivery", "Nurture sequence (3–5)", "Full launch sequence"] },
  ] },
  { id: "assets", num: "06", title: "Brand & assets", icon: "palette", qs: [
    { key: "brand", label: "Brand system", hint: "Where the look comes from.", kind: "single", opts: ["Use existing Brand System", "Client will provide", "Studio to create"] },
    { key: "copy", label: "Who writes the copy?", kind: "single", opts: ["Studio drafts", "Client provides", "Collaborative"] },
    { key: "need", label: "Assets we’ll collect", hint: "Each becomes a folder on the funnel.", kind: "multi", opts: ["Logo & brand kit", "Product photos", "Headshots / team", "Video (VSL)", "Testimonials", "Lead magnet file", "Legal / policy pages"] },
  ] },
  { id: "tech", num: "07", title: "Tech & integrations", icon: "settings", qs: [
    { key: "platform", label: "Build platform", kind: "single", opts: ["Webflow", "ClickFunnels", "Kajabi", "GoHighLevel", "WordPress", "Custom"] },
    { key: "domain", label: "Domain", kind: "text", ph: "e.g. get.brand.com" },
    { key: "email", label: "Email / CRM", kind: "single", opts: ["Not set up yet", "Mailchimp", "ConvertKit", "ActiveCampaign", "HubSpot", "GoHighLevel"] },
    { key: "payment", label: "Payments", kind: "single", opts: ["None (lead gen)", "Stripe", "PayPal", "Platform native"] },
    { key: "tracking", label: "Tracking & pixels", hint: "What we’ll wire up for measurement.", kind: "multi", opts: ["Google Analytics", "Meta Pixel", "Google Ads", "TikTok Pixel", "Conversion API"] },
  ] },
];

export const FUNNEL_STAGES: DiscoveryStage[] = [
  { key: "discovery", label: "Discovery", icon: "inbox" },
  { key: "flow", label: "Funnel flow", icon: "funnel" },
  { key: "copy", label: "Copy", icon: "sparkle" },
  { key: "wireframe", label: "Wireframe", icon: "grid" },
  { key: "brief", label: "Development plan", icon: "checklist" },
];

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

export const AUDIT_STAGES: DiscoveryStage[] = [
  { key: "discovery", label: "Audit intake", icon: "inbox" },
  { key: "report", label: "Audit report", icon: "chart" },
  { key: "plan", label: "Action plan", icon: "checklist" },
];

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
