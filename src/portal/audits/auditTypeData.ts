import type { DiscoveryIntroStep, DiscoveryStage, DiscoveryTopic } from "../discovery/DiscoveryBuilder";
import type { AuditType } from "../types";

export const SHARED_AUDIT_STAGES: DiscoveryStage[] = [
  { key: "discovery", label: "Audit intake", icon: "inbox" },
  { key: "report", label: "Audit report", icon: "chart" },
  { key: "plan", label: "Action plan", icon: "checklist" },
];

export const BRAND_AUDIT_WIZARD: DiscoveryTopic[] = [
  { id: "identity", num: "01", title: "Brand foundation", icon: "grid", qs: [
    { key: "nickname", label: "What should we call you?", kind: "text", ph: "Name or nickname" },
    { key: "name", label: "What is the brand or business name?", kind: "text", ph: "Brand name" },
    { key: "url", label: "What is the main website URL?", kind: "text", ph: "https://brand.com" },
    { key: "purpose", label: "Why does this brand exist beyond making a sale?", kind: "textarea", ph: "The change, belief, or purpose behind the business…" },
  ] },
  { id: "positioning", num: "02", title: "Positioning & audience", icon: "target", qs: [
    { key: "audience", label: "Who should this brand feel made for?", kind: "textarea", ph: "Primary audience, situation, needs, and aspirations…" },
    { key: "offer", label: "What does the brand sell or provide?", kind: "textarea", ph: "Core products, services, and offers…" },
    { key: "difference", label: "What should make this brand meaningfully different?", kind: "textarea", ph: "Why choose this brand over the alternatives?" },
    { key: "positioning", label: "How clearly is the positioning documented today?", kind: "single", opts: ["Not documented", "Loosely understood", "Written but generic", "Clear and differentiated", "Fully established"] },
  ] },
  { id: "voice", num: "03", title: "Messaging & voice", icon: "msg", qs: [
    { key: "promise", label: "What is the main promise or transformation?", kind: "textarea", ph: "What should customers expect to become, feel, or achieve?" },
    { key: "voice", label: "How should the brand sound?", kind: "multi", opts: ["Warm", "Direct", "Premium", "Playful", "Grounded", "Editorial", "Authoritative", "Minimal"] },
    { key: "phrases", label: "Are there signature phrases, claims, or words to preserve?", kind: "textarea", ph: "Taglines, recurring language, approved claims…" },
    { key: "avoid", label: "What should the brand never sound or look like?", kind: "textarea", ph: "Words, tones, visual clichés, or competitor similarities to avoid…" },
  ] },
  { id: "visual", num: "04", title: "Visual identity", icon: "palette", qs: [
    { key: "guidelines", label: "What brand guidelines already exist?", kind: "single", opts: ["None", "Logo and colours only", "Partial guidelines", "Full guidelines", "Needs consolidation"] },
    { key: "assets", label: "Which identity assets already exist?", kind: "multi", opts: ["Logo suite", "Colour palette", "Typography", "Photography", "Illustration", "Icons", "Templates", "Packaging"] },
    { key: "visualFeel", label: "How should the visual system feel?", kind: "multi", opts: ["Bold", "Calm", "Premium", "Organic", "Technical", "Playful", "Editorial", "Minimal"] },
    { key: "socialLinks", label: "Which social profiles should we review?", kind: "textarea", ph: "Instagram, TikTok, LinkedIn, Pinterest — one URL per line" },
  ] },
  { id: "system", num: "05", title: "Brand system & priorities", icon: "layers", qs: [
    { key: "touchpoints", label: "Where must the brand system work consistently?", kind: "multi", opts: ["Website", "Social media", "Email", "Sales decks", "Documents", "Packaging", "Events", "Advertising"] },
    { key: "problems", label: "What currently feels inconsistent or difficult to use?", kind: "textarea", ph: "Describe the biggest brand problems the kit should solve…" },
    { key: "kitNeeds", label: "What should the generated brand kit include?", kind: "multi", opts: ["Positioning", "Messaging framework", "Voice guide", "Logo rules", "Colour swatches", "Typography", "Imagery direction", "Social templates"] },
    { key: "priority", label: "What is the most important improvement to make first?", kind: "textarea", ph: "The first decision or correction the new guidelines must address…" },
  ] },
];

export const SEO_AUDIT_WIZARD: DiscoveryTopic[] = [
  { id: "setup", num: "01", title: "Website & access", icon: "link", qs: [
    { key: "nickname", label: "What should we call you?", kind: "text", ph: "Name or nickname" },
    { key: "name", label: "What is the brand or business name?", kind: "text", ph: "Brand name" },
    { key: "url", label: "What website should we audit?", kind: "text", ph: "https://brand.com" },
    { key: "ga4Status", label: "Is GA4 available for this website?", kind: "single", opts: ["Connected", "Can be connected", "Not installed", "Not sure"] },
  ] },
  { id: "goals", num: "02", title: "Search goals", icon: "target", qs: [
    { key: "seoGoal", label: "What should organic search help the business achieve?", kind: "multi", opts: ["Qualified traffic", "Leads", "Sales", "Local visibility", "Thought leadership", "Brand discovery"] },
    { key: "markets", label: "Which countries, regions, or cities matter most?", kind: "textarea", ph: "Primary search markets and service areas…" },
    { key: "audience", label: "Who is the priority search audience?", kind: "textarea", ph: "Who searches, what they need, and what they should do next…" },
    { key: "conversion", label: "What is the main conversion from organic traffic?", kind: "single", opts: ["Purchase", "Book a call", "Submit an inquiry", "Visit a location", "Join the list", "Read or learn"] },
  ] },
  { id: "content", num: "03", title: "Content & keywords", icon: "file", qs: [
    { key: "offers", label: "Which products, services, or topics matter most?", kind: "textarea", ph: "Priority offers and content themes…" },
    { key: "keywords", label: "Which keywords or search themes are already important?", kind: "textarea", ph: "Known phrases, service terms, questions, or categories…" },
    { key: "contentState", label: "What content exists today?", kind: "multi", opts: ["Service pages", "Product pages", "Blog", "Case studies", "Locations", "FAQs", "Guides", "Video"] },
    { key: "contentGap", label: "Where does the current content feel weak or incomplete?", kind: "textarea", ph: "Missing topics, thin pages, outdated articles, unclear intent…" },
  ] },
  { id: "technical", num: "04", title: "Technical context", icon: "activity", qs: [
    { key: "platform", label: "What platform is the website built on?", kind: "single", opts: ["Shopify", "WordPress", "Webflow", "Wix / Squarespace", "Custom", "Not sure"] },
    { key: "changes", label: "Were there recent redesigns, migrations, or domain changes?", kind: "textarea", ph: "Dates, platforms, redirects, or known traffic changes…" },
    { key: "issues", label: "Which SEO issues are already suspected?", kind: "multi", opts: ["Indexing", "Site speed", "Mobile UX", "Metadata", "Duplicate content", "Broken links", "Tracking", "Traffic decline"] },
    { key: "constraints", label: "Are there technical or compliance constraints?", kind: "textarea", ph: "CMS limitations, approval requirements, regulated claims…" },
  ] },
  { id: "measurement", num: "05", title: "Measurement & priorities", icon: "chart", qs: [
    { key: "tracking", label: "What measurement is available?", kind: "multi", opts: ["GA4", "Google Search Console", "Conversions", "Ecommerce", "Call tracking", "CRM", "None", "Not sure"] },
    { key: "trafficChange", label: "Has organic performance changed recently?", kind: "textarea", ph: "Growth, decline, seasonality, or notable dates…" },
    { key: "priorityPages", label: "Which pages should receive attention first?", kind: "textarea", ph: "URLs or page types tied most closely to revenue…" },
    { key: "priority", label: "What would make this SEO audit successful?", kind: "textarea", ph: "The decisions or actions the report needs to unlock…" },
  ] },
];

export const AUDIT_TYPE_INTRO: Record<Exclude<AuditType, "website">, DiscoveryIntroStep[]> = {
  brand: [
    { title: "Brand Foundation", tag: "Purpose & positioning", icon: "grid" },
    { title: "Messaging & Voice", tag: "Promise & language", icon: "msg" },
    { title: "Visual Identity", tag: "Logo, type & colour", icon: "palette" },
    { title: "Brand System", tag: "Rules & consistency", icon: "layers" },
    { title: "Brand Kit", tag: "Usable direction", icon: "file" },
    { title: "Improvement Insights", tag: "What to fix next", icon: "target" },
  ],
  seo: [
    { title: "Technical SEO", tag: "Crawl & index", icon: "activity" },
    { title: "On-page SEO", tag: "Metadata & structure", icon: "file" },
    { title: "Content & Intent", tag: "Topics & landing pages", icon: "msg" },
    { title: "Internal Links", tag: "Discovery paths", icon: "link" },
    { title: "GA4 Performance", tag: "Behavior & conversion", icon: "chart" },
    { title: "Action Plan", tag: "Prioritized fixes", icon: "checklist" },
  ],
};

export const AUDIT_TYPE_DEMO: Record<string, string | string[]> = {};
