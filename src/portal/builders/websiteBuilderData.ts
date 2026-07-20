import type { DiscoveryTopic } from "../discovery/DiscoveryBuilder";

export const WEBSITE_BUILDER_WIZARD: DiscoveryTopic[] = [
  { id: "context", num: "01", title: "Starting point", icon: "grid", qs: [
    { key: "nickname", label: "What should we call you?", kind: "text", ph: "Name or nickname" },
    { key: "brandName", label: "What is the brand or business name?", kind: "text", ph: "Brand name" },
    { key: "sourceApproach", label: "What should we use to plan the website?", kind: "single", opts: ["Existing website", "Uploaded brief or copy", "Existing website plus uploaded material"] },
    { key: "url", label: "What is the existing website URL, if there is one?", kind: "text", ph: "https://brand.com (optional)" },
    { key: "sourceSummary", label: "What should we preserve or learn from the source material?", kind: "textarea", ph: "Strong messaging, useful sections, approved offers, required facts, existing SEO value…" },
  ] },
  { id: "goals", num: "02", title: "Goals & audience", icon: "target", qs: [
    { key: "goals", label: "What must the redesigned website achieve?", kind: "multi", opts: ["Generate leads", "Sell products", "Book calls", "Explain services", "Build authority", "Support customers", "Recruit talent"] },
    { key: "audience", label: "Who are the priority website audiences?", kind: "textarea", ph: "Primary and secondary audiences, needs, and decisions…" },
    { key: "primaryAction", label: "What is the primary action visitors should take?", kind: "text", ph: "Book, buy, inquire, subscribe, visit…" },
    { key: "success", label: "How will you know the redesign worked?", kind: "textarea", ph: "Conversion, engagement, operational, or qualitative outcomes…" },
  ] },
  { id: "scope", num: "03", title: "Sitemap & page briefs", icon: "file", qs: [
    { key: "pagesToDesign", label: "Which pages should we design and build?", hint: "This becomes the final website scope. Add one page per line.", kind: "textarea", list: true, ph: "• Home\n• About\n• Services\n• Service detail template\n• Contact" },
    { key: "pageBriefs", label: "What should each page help the visitor understand or do?", hint: "Use one line per page: page name — purpose, key message, and primary action.", kind: "textarea", list: true, ph: "• Home — explain the offer and direct visitors to book a call\n• Services — compare the core services and lead into each detail page" },
    { key: "mustKeep", label: "Which existing content, URLs, or resources must carry over?", hint: "Include only material that should inform the new pages.", kind: "textarea", list: true, ph: "• Approved service copy\n• Existing case studies\n• /privacy and /terms URLs" },
    { key: "removePages", label: "Which pages should be merged, redirected, or retired?", kind: "textarea", ph: "Known duplicates, outdated offers, old campaigns…" },
    { key: "languages", label: "Does the site need multiple languages or regional versions?", kind: "single", opts: ["No", "Possibly later", "Yes — one additional language", "Yes — multiple languages or regions"] },
  ] },
  { id: "function", num: "04", title: "Functionality & systems", icon: "activity", qs: [
    { key: "features", label: "What functionality must the new website include?", kind: "multi", opts: ["Forms", "Booking", "Ecommerce", "Membership", "Search", "Blog / resources", "Locations", "Job listings", "Customer portal", "Calculator or quiz"] },
    { key: "integrations", label: "Which tools must connect to the website?", kind: "textarea", ph: "CRM, email, payments, scheduling, analytics, support…" },
    { key: "platform", label: "Is there a preferred platform?", kind: "single", opts: ["Keep the current platform", "Shopify", "WordPress", "Webflow", "Custom / Next.js", "Open to recommendation"] },
    { key: "constraints", label: "What technical, legal, or operational constraints matter?", kind: "textarea", ph: "Hosting, compliance, accessibility, approvals, deadlines…" },
  ] },
  { id: "content", num: "05", title: "Copy & build handoff", icon: "msg", qs: [
    { key: "contentSources", label: "Which content should the page plan use?", kind: "multi", opts: ["Existing website copy", "Uploaded brief", "Uploaded copy document", "Brand or audit handoff", "New copy to write"] },
    { key: "copyApproach", label: "How should we prepare the copy for the scoped pages?", kind: "single", opts: ["Map existing copy to the new sitemap", "Edit and reorganize existing copy", "Write new page copy", "Combine existing and new copy", "Structure only — copy supplied later"] },
    { key: "copyNotes", label: "What messages, offers, proof, or calls to action must appear?", kind: "textarea", ph: "List approved claims, services, testimonials, proof points, offers, and required CTAs…" },
    { key: "contentOwner", label: "Who approves the final page copy and assets?", kind: "single", opts: ["Client", "Studio", "Shared responsibility", "Not decided"] },
    { key: "assets", label: "Which assets are ready or still needed?", kind: "textarea", ph: "Brand kit, photography, video, product data, testimonials, downloads…" },
    { key: "timeline", label: "Is there a target launch date or dependency?", kind: "textarea", ph: "Launch date, campaign, event, product release…" },
  ] },
];
