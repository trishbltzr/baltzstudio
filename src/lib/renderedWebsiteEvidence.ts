import { launch } from "chrome-launcher";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
import type { AuditCheckResult, LighthouseRun } from "./auditChecklist";

export interface ObservedWebsiteColor {
  hex: string;
  count: number;
  contexts: string[];
}

export interface RenderedPageEvidence {
  strategy: "mobile" | "desktop";
  url: string;
  title: string;
  description: string;
  canonical: string;
  lang: string;
  viewport: { width: number; height: number; horizontalOverflow: boolean; documentHeight: number };
  typography: { bodyFontSize: number; minTextSize: number; fontFamilies: string[]; uppercaseRatio: number; headingLevels: number[]; headingStyleCount: number };
  visualIdentity: { colors: ObservedWebsiteColor[]; headingFonts: string[]; bodyFonts: string[]; logoUrl: string };
  navigation: { visible: boolean; nearTop: boolean; linkCount: number; hasAbout: boolean; hasContact: boolean; hasSupport: boolean; hasHomeLogo: boolean; hasCurrentPage: boolean };
  footer: { visible: boolean; linkCount: number; socialLinkCount: number };
  controls: { count: number; undersized: number; medianHeight: number; distinctStyles: number; semanticRatio: number; linkDistinctRatio: number; disabledCount: number; explainedDisabledCount: number };
  forms: { count: number; inputCount: number; labeledRatio: number; placeholderRatio: number; autocompleteRatio: number; usefulInputTypeRatio: number; visibleLabelsRatio: number; singleColumnRatio: number };
  content: { h1Count: number; sectionCount: number; mainLandmark: boolean; headingAboveFold: boolean; actionAboveFold: boolean; addressPresent: boolean; phoneOrEmailPresent: boolean; pricePresent: boolean; faqPresent: boolean; searchPresent: boolean };
  images: { count: number; altRatio: number; highResolutionRatio: number; dimensionedRatio: number; lazyRatio: number };
  metadata: { robots: string; hasStructuredData: boolean; hasAnalytics: boolean; hasSitemapLink: boolean };
}

export interface SiteTechnicalEvidence {
  https: boolean;
  httpRedirectsToHttps: boolean | null;
  hostRedirectConsistent: boolean | null;
  sitemapAvailable: boolean;
  robotsAvailable: boolean;
  notFoundHelpful: boolean | null;
  brokenLinksChecked: number;
  brokenLinks: string[];
}

export interface WebsiteEvidenceBundle {
  rendered: RenderedPageEvidence[];
  technical: SiteTechnicalEvidence;
}

async function inspectPage(page: Page, url: string, strategy: "mobile" | "desktop"): Promise<RenderedPageEvidence> {
  const mobile = strategy === "mobile";
  await page.setViewport({ width: mobile ? 390 : 1440, height: mobile ? 844 : 900, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30_000 });
  await page.evaluate("globalThis.__name = globalThis.__name || ((target) => target)");
  return page.evaluate((strategyValue) => {
    const visible = (element: Element) => {
      const style = getComputedStyle(element);
      const rect = (element as HTMLElement).getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
    };
    const medianValue = (values: number[]) => {
      if (!values.length) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };
    const clean = (value: string | null | undefined) => (value || "").trim();
    const elements = <T extends Element>(selector: string) => Array.from(document.querySelectorAll<T>(selector)).filter(visible);
    const textNodes = elements<HTMLElement>("p,li,label,a,button,input,textarea,select,h1,h2,h3,h4,h5,h6").filter(element => clean(element.innerText || element.getAttribute("value")).length > 0);
    const fontSizes = textNodes.map(element => parseFloat(getComputedStyle(element).fontSize)).filter(Number.isFinite);
    const fontName = (element: Element) => getComputedStyle(element).fontFamily.split(",")[0].replace(/["']/g, "").trim();
    const rankFonts = (items: Element[]) => {
      const counts = new Map<string, number>();
      items.map(fontName).filter(Boolean).forEach(font => counts.set(font, (counts.get(font) || 0) + 1));
      return [...counts].sort((left, right) => right[1] - left[1]).map(([font]) => font).slice(0, 6);
    };
    const families = rankFonts(textNodes);
    const headings = elements<HTMLElement>("h1,h2,h3,h4,h5,h6");
    const bodyText = elements<HTMLElement>("p,li,label,a,button,input,textarea,select").filter(element => clean(element.innerText || element.getAttribute("value")).length > 0);
    const headingStyles = new Set(headings.map(element => { const style = getComputedStyle(element); return `${element.tagName}:${style.fontSize}:${style.fontWeight}:${style.fontFamily}`; }));
    const toHex = (value: string) => {
      const numbers = value.match(/[\d.]+/g)?.map(Number) || [];
      if (numbers.length < 3 || numbers.length > 3 && numbers[3] === 0) return "";
      return `#${numbers.slice(0, 3).map(channel => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
    };
    const observedColors = new Map<string, { count: number; contexts: Set<string> }>();
    const recordColor = (value: string, context: string, weight = 1) => {
      const hex = toHex(value);
      if (!hex) return;
      const current = observedColors.get(hex) || { count: 0, contexts: new Set<string>() };
      current.count += weight;
      current.contexts.add(context);
      observedColors.set(hex, current);
    };
    elements<HTMLElement>("body,header,nav,main,section,article,footer,h1,h2,h3,h4,h5,h6,p,a,button,[role=button]").slice(0, 1_200).forEach(element => {
      const style = getComputedStyle(element);
      recordColor(style.color, "text");
      recordColor(style.backgroundColor, "background", 3);
      if (style.borderTopStyle !== "none" && parseFloat(style.borderTopWidth) > 0) recordColor(style.borderTopColor, "border");
    });
    const logoCandidate = elements<HTMLImageElement>("header img,nav img,[class*=logo] img,img[class*=logo]")
      .find(image => /logo|brand/i.test(`${image.alt} ${image.className} ${image.src}`))
      || elements<HTMLImageElement>("header img,nav img")[0];
    const uppercaseChars = textNodes.reduce((sum, element) => sum + (clean(element.innerText).match(/[A-Z]/g)?.length || 0), 0);
    const letterChars = textNodes.reduce((sum, element) => sum + (clean(element.innerText).match(/[A-Za-z]/g)?.length || 0), 0);
    const nav = elements<HTMLElement>("nav,[role=navigation]")[0];
    const navLinks = nav ? elements<HTMLAnchorElement>("nav a,[role=navigation] a") : [];
    const footer = elements<HTMLElement>("footer,[role=contentinfo]")[0];
    const footerLinks = footer ? Array.from(footer.querySelectorAll<HTMLAnchorElement>("a")).filter(visible) : [];
    const controls = elements<HTMLElement>("button,a[href],input,select,textarea,[role=button]");
    const tapControls = elements<HTMLElement>("button,input:not([type=hidden]),select,textarea,[role=button],nav a,header a");
    const controlRects = tapControls.map(element => element.getBoundingClientRect());
    const controlStyles = new Set(elements<HTMLElement>("button,[role=button],input[type=submit],input[type=button]").map(element => { const style = getComputedStyle(element); return `${style.backgroundColor}:${style.color}:${style.borderRadius}:${style.borderColor}`; }));
    const textLinks = elements<HTMLAnchorElement>("main a[href],article a[href],p a[href]");
    const bodyColor = getComputedStyle(document.body).color;
    const distinctTextLinks = textLinks.filter(link => { const style = getComputedStyle(link); return style.textDecorationLine !== "none" || style.color !== bodyColor || Number(style.fontWeight) >= 600; });
    const semanticControls = controls.filter(element => ["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(element.tagName));
    const disabled = controls.filter(element => element.matches(":disabled,[aria-disabled=true]"));
    const forms = elements<HTMLFormElement>("form");
    const inputs = elements<HTMLInputElement>("input:not([type=hidden]),textarea,select");
    const labelFor = (input: HTMLInputElement) => {
      const id = input.id;
      return !!(input.closest("label") || id && document.querySelector(`label[for="${CSS.escape(id)}"]`) || input.getAttribute("aria-label") || input.getAttribute("aria-labelledby"));
    };
    const visibleLabelFor = (input: HTMLInputElement) => {
      const id = input.id;
      const label = input.closest("label") || id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
      return !!(label && visible(label));
    };
    const usefulType = (input: HTMLInputElement) => {
      const expected = /email/i.test(`${input.name} ${input.autocomplete} ${input.placeholder}`) ? "email" : /phone|tel/i.test(`${input.name} ${input.autocomplete} ${input.placeholder}`) ? "tel" : /url|website/i.test(`${input.name} ${input.placeholder}`) ? "url" : null;
      return !expected || input.type === expected;
    };
    const singleColumn = (form: HTMLFormElement) => {
      const fields = Array.from(form.querySelectorAll<HTMLElement>("input:not([type=hidden]),textarea,select")).filter(visible);
      if (fields.length < 2) return true;
      const lefts = fields.map(field => Math.round(field.getBoundingClientRect().left / 12) * 12);
      return new Set(lefts).size <= Math.max(1, Math.ceil(fields.length / 3));
    };
    const images = elements<HTMLImageElement>("img");
    const ratio = (count: number, total: number) => total ? Math.round((count / total) * 100) : 100;
    const bodyStyle = getComputedStyle(document.body);
    const pageText = clean(document.body.innerText);
    const metadataContent = (selector: string) => clean(document.querySelector<HTMLMetaElement>(selector)?.content);
    return {
      strategy: strategyValue,
      url: location.href,
      title: document.title,
      description: metadataContent('meta[name="description"]'),
      canonical: clean(document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href),
      lang: clean(document.documentElement.lang),
      viewport: { width: innerWidth, height: innerHeight, horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 4, documentHeight: document.documentElement.scrollHeight },
      typography: {
        bodyFontSize: parseFloat(bodyStyle.fontSize) || 0,
        minTextSize: fontSizes.length ? Math.min(...fontSizes) : 0,
        fontFamilies: families.slice(0, 8),
        uppercaseRatio: letterChars ? Math.round((uppercaseChars / letterChars) * 100) : 0,
        headingLevels: headings.map(element => Number(element.tagName.slice(1))),
        headingStyleCount: headingStyles.size,
      },
      visualIdentity: {
        colors: [...observedColors].sort((left, right) => right[1].count - left[1].count).slice(0, 18).map(([hex, value]) => ({ hex, count: value.count, contexts: [...value.contexts] })),
        headingFonts: rankFonts(headings),
        bodyFonts: rankFonts(bodyText),
        logoUrl: clean(logoCandidate?.currentSrc || logoCandidate?.src),
      },
      navigation: {
        visible: !!nav,
        nearTop: !!nav && nav.getBoundingClientRect().top < 240,
        linkCount: navLinks.length,
        hasAbout: navLinks.some(link => /about|story|team/i.test(`${link.textContent} ${link.pathname}`)),
        hasContact: navLinks.some(link => /contact|book|consult|apply/i.test(`${link.textContent} ${link.pathname}`)),
        hasSupport: navLinks.some(link => /support|help|faq/i.test(`${link.textContent} ${link.pathname}`)),
        hasHomeLogo: navLinks.some(link => link.pathname === "/" && !!link.querySelector("img,svg") || /home|logo/i.test(`${link.getAttribute("aria-label")} ${link.textContent}`)),
        hasCurrentPage: navLinks.some(link => link.getAttribute("aria-current") === "page" || link.classList.contains("active")),
      },
      footer: { visible: !!footer, linkCount: footerLinks.length, socialLinkCount: footerLinks.filter(link => /instagram|facebook|linkedin|youtube|tiktok|pinterest|twitter|x\.com/i.test(link.href)).length },
      controls: {
        count: controls.length,
        undersized: controlRects.filter(rect => rect.width < 40 || rect.height < 40).length,
        medianHeight: medianValue(controlRects.map(rect => Math.round(rect.height))),
        distinctStyles: controlStyles.size,
        semanticRatio: ratio(semanticControls.length, controls.length),
        linkDistinctRatio: ratio(distinctTextLinks.length, textLinks.length),
        disabledCount: disabled.length,
        explainedDisabledCount: disabled.filter(element => !!(element.getAttribute("title") || element.getAttribute("aria-describedby") || element.closest("[data-tooltip]"))).length,
      },
      forms: {
        count: forms.length,
        inputCount: inputs.length,
        labeledRatio: ratio(inputs.filter(labelFor).length, inputs.length),
        placeholderRatio: ratio(inputs.filter(input => !!input.getAttribute("placeholder")).length, inputs.length),
        autocompleteRatio: ratio(inputs.filter(input => !!input.getAttribute("autocomplete")).length, inputs.length),
        usefulInputTypeRatio: ratio(inputs.filter(usefulType).length, inputs.length),
        visibleLabelsRatio: ratio(inputs.filter(visibleLabelFor).length, inputs.length),
        singleColumnRatio: ratio(forms.filter(singleColumn).length, forms.length),
      },
      content: {
        h1Count: elements("h1").length,
        sectionCount: elements("main section,main article").length,
        mainLandmark: elements("main,[role=main]").length > 0,
        headingAboveFold: headings.some(element => element.getBoundingClientRect().top < innerHeight),
        actionAboveFold: controls.some(element => element.getBoundingClientRect().top < innerHeight && /buy|shop|book|contact|start|learn|view|add|order|get/i.test(clean(element.textContent))),
        addressPresent: !!document.querySelector("address") || /\b\d{1,5}\s+[A-Za-z0-9 .'-]+\s(?:street|st|road|rd|avenue|ave|drive|dr|lane|ln|boulevard|blvd)\b/i.test(pageText),
        phoneOrEmailPresent: /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\d\s().-]{7,}\d)/.test(pageText),
        pricePresent: /(?:[$£€]\s?\d|\d\s?(?:USD|GBP|EUR))/.test(pageText),
        faqPresent: /\bfaq\b|frequently asked/i.test(pageText),
        searchPresent: !!document.querySelector('input[type="search"],[role="search"]'),
      },
      images: {
        count: images.length,
        altRatio: ratio(images.filter(image => image.hasAttribute("alt")).length, images.length),
        highResolutionRatio: ratio(images.filter(image => image.naturalWidth >= image.getBoundingClientRect().width * devicePixelRatio * 0.75).length, images.length),
        dimensionedRatio: ratio(images.filter(image => !!(image.width && image.height || image.getAttribute("width") && image.getAttribute("height"))).length, images.length),
        lazyRatio: ratio(images.filter(image => image.loading === "lazy").length, images.length),
      },
      metadata: {
        robots: metadataContent('meta[name="robots"]'),
        hasStructuredData: document.querySelectorAll('script[type="application/ld+json"]').length > 0,
        hasAnalytics: Array.from(document.scripts).some(script => /googletagmanager|google-analytics|gtag\(|plausible|segment|analytics/i.test(`${script.src} ${script.textContent}`)),
        hasSitemapLink: Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]')).some(link => /sitemap/i.test(`${link.href} ${link.textContent}`)),
      },
    };
  }, strategy);
}

async function fetchStatus(url: URL) {
  try {
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8_000), headers: { "User-Agent": "BaltazarStudioAuditBot/1.0" } });
    return response;
  } catch {
    return null;
  }
}

async function collectTechnicalEvidence(input: string, rendered: RenderedPageEvidence[]): Promise<SiteTechnicalEvidence> {
  const start = new URL(input);
  const httpUrl = new URL(start); httpUrl.protocol = "http:";
  const httpResponse = await fetchStatus(httpUrl);
  const httpLocation = httpResponse?.headers.get("location") || "";
  const wwwUrl = new URL(start); wwwUrl.hostname = start.hostname.startsWith("www.") ? start.hostname.slice(4) : `www.${start.hostname}`;
  const wwwResponse = await fetchStatus(wwwUrl);
  const wwwLocation = wwwResponse?.headers.get("location") || "";
  const sitemapResponse = await fetchStatus(new URL("/sitemap.xml", start));
  const robotsResponse = await fetchStatus(new URL("/robots.txt", start));
  const notFoundResponse = await fetchStatus(new URL(`/audit-check-${Date.now()}`, start));
  const brokenLinks = new Set<string>();
  const checked = [...new Set(rendered.map(page => page.url))].slice(0, 12);
  for (const link of checked) {
    const response = await fetchStatus(new URL(link));
    if (response && response.status >= 400) brokenLinks.add(link);
  }
  return {
    https: start.protocol === "https:",
    httpRedirectsToHttps: httpResponse ? httpResponse.status >= 300 && httpResponse.status < 400 && /^https:/i.test(httpLocation) : null,
    hostRedirectConsistent: wwwResponse ? wwwResponse.status >= 300 && wwwResponse.status < 400 && new URL(wwwLocation, wwwUrl).hostname === start.hostname : null,
    sitemapAvailable: !!sitemapResponse?.ok,
    robotsAvailable: !!robotsResponse?.ok,
    notFoundHelpful: notFoundResponse ? notFoundResponse.status === 404 : null,
    brokenLinksChecked: checked.length,
    brokenLinks: [...brokenLinks],
  };
}

export async function collectWebsiteEvidence(urls: string[]): Promise<WebsiteEvidenceBundle> {
  if (!urls.length) return { rendered: [], technical: { https: false, httpRedirectsToHttps: null, hostRedirectConsistent: null, sitemapAvailable: false, robotsAvailable: false, notFoundHelpful: null, brokenLinksChecked: 0, brokenLinks: [] } };
  let browser: Browser;
  let closeBrowser: () => Promise<void>;
  const chromePath = process.env.CHROME_PATH || (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : undefined);
  if (chromePath) {
    const chrome = await launch({ chromePath, chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
    browser = await puppeteer.connect({ browserURL: `http://127.0.0.1:${chrome.port}` });
    closeBrowser = async () => { await browser.disconnect(); await chrome.kill(); };
  } else {
    const { default: chromium } = await import("@sparticuz/chromium");
    browser = await puppeteer.launch({ executablePath: await chromium.executablePath(), args: chromium.args, headless: true });
    closeBrowser = async () => { await browser.close(); };
  }
  const rendered: RenderedPageEvidence[] = [];
  try {
    for (const strategy of ["desktop", "mobile"] as const) {
      for (const url of urls) {
        const page = await browser.newPage();
        try { rendered.push(await inspectPage(page, url, strategy)); }
        catch (error) { console.warn("Rendered audit page inspection failed.", { url, strategy, message: error instanceof Error ? error.message : String(error) }); }
        finally { await page.close(); }
      }
    }
  } finally {
    await closeBrowser();
  }
  return { rendered, technical: await collectTechnicalEvidence(urls[0], rendered) };
}

export function automatedAuditChecks(bundle: WebsiteEvidenceBundle, lighthouse: LighthouseRun[]) {
  const checks = new Map<string, AuditCheckResult>();
  const pages = bundle.rendered;
  const desktop = pages.filter(page => page.strategy === "desktop");
  const mobile = pages.filter(page => page.strategy === "mobile");
  const home = desktop[0] || mobile[0];
  const source = home?.url || null;
  const set = (id: string, status: AuditCheckResult["status"], evidence: string, sourceUrl = source) => checks.set(id, { id, label: "", status, evidence, sourceUrl });
  const every = <T,>(items: T[], predicate: (item: T) => boolean) => items.length > 0 && items.every(predicate);
  const some = <T,>(items: T[], predicate: (item: T) => boolean) => items.some(predicate);
  const avg = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
  const hasForms = some(pages, page => page.forms.inputCount > 0);
  const hasLogin = pages.some(page => /login|sign-in|account/i.test(page.url));
  const hasGallery = pages.some(page => /gallery|collection|product/i.test(page.url) && page.images.count > 1);

  if (pages.length) {
    set("design-02", hasForms ? (avg(pages.map(page => page.forms.singleColumnRatio)) >= 70 ? "pass" : "fail") : "not_applicable", hasForms ? `Rendered forms are ${avg(pages.map(page => page.forms.singleColumnRatio))}% single-column or clearly grouped.` : "No multi-field form was present on the audited pages.");
    set("design-01", hasForms ? (avg(pages.map(page => page.forms.labeledRatio)) >= 80 ? "pass" : "fail") : "not_applicable", hasForms ? `${avg(pages.map(page => page.forms.labeledRatio))}% of rendered fields communicate their intent with a label or accessible name.` : "No form was present on the audited pages.");
    set("design-03", hasForms ? (avg(mobile.map(page => page.controls.undersized === 0 ? 100 : 0)) >= 70 ? "pass" : "fail") : "not_applicable", `${mobile.reduce((sum, page) => sum + page.controls.undersized, 0)} undersized mobile controls were detected across ${mobile.length} rendered pages.`);
    set("design-04", hasForms ? (avg(mobile.map(page => page.controls.medianHeight)) >= 40 ? "pass" : "fail") : "not_applicable", `Median mobile control height is ${avg(mobile.map(page => page.controls.medianHeight))}px.`);
    set("design-06", hasForms ? (avg(pages.map(page => page.forms.singleColumnRatio)) >= 70 ? "pass" : "fail") : "not_applicable", `Rendered form single-column coverage is ${avg(pages.map(page => page.forms.singleColumnRatio))}%.`);
    set("design-09", hasForms ? (avg(pages.map(page => page.forms.placeholderRatio)) >= 60 ? "pass" : "fail") : "not_applicable", `Placeholder coverage is ${avg(pages.map(page => page.forms.placeholderRatio))}% across rendered inputs.`);
    set("design-12", every(pages, page => page.controls.medianHeight >= 36) ? "pass" : "fail", `Median rendered control height ranges from ${Math.min(...pages.map(page => page.controls.medianHeight))}px to ${Math.max(...pages.map(page => page.controls.medianHeight))}px.`);
    set("design-13", some(pages, page => page.controls.distinctStyles >= 2) ? "pass" : "fail", `The rendered interface exposes up to ${Math.max(...pages.map(page => page.controls.distinctStyles))} distinct button treatments.`);
    set("design-17", avg(pages.map(page => page.controls.linkDistinctRatio)) >= 80 ? "pass" : "fail", `${avg(pages.map(page => page.controls.linkDistinctRatio))}% of in-content links are visually distinguished by decoration, color, or weight.`);
    set("design-18", some(pages, page => page.typography.headingStyleCount > 1) ? "pass" : "fail", "Rendered headings use a distinguishable size and weight hierarchy.");
    set("design-19", every(desktop, page => page.typography.minTextSize >= 14) ? "pass" : "fail", `Smallest rendered desktop text is ${Math.min(...desktop.map(page => page.typography.minTextSize))}px.`);
    set("design-20", every(pages, page => page.typography.fontFamilies.length <= 3) ? "pass" : "fail", `Rendered pages use between ${Math.min(...pages.map(page => page.typography.fontFamilies.length))} and ${Math.max(...pages.map(page => page.typography.fontFamilies.length))} primary font styles.`);
    set("design-21", every(pages, page => page.typography.headingStyleCount > 1 && page.controls.distinctStyles > 0) ? "pass" : "fail", "Computed typography and control styles were compared across rendered content, headings, navigation, and actions.");
    set("design-22", avg(pages.map(page => page.typography.uppercaseRatio)) <= 18 ? "pass" : "fail", `Uppercase characters represent ${avg(pages.map(page => page.typography.uppercaseRatio))}% of rendered text.`);
    set("design-23", every(pages, page => page.typography.fontFamilies.length <= 2) ? "pass" : "fail", `Rendered pages use between ${Math.min(...pages.map(page => page.typography.fontFamilies.length))} and ${Math.max(...pages.map(page => page.typography.fontFamilies.length))} font families.`);
    set("design-25", avg(pages.map(page => page.typography.uppercaseRatio)) <= 18 ? "pass" : "fail", "Capitalization was measured from rendered page text.");
    set("design-26", every(pages, page => page.typography.headingStyleCount <= 8) ? "pass" : "fail", `Heading-style count ranges from ${Math.min(...pages.map(page => page.typography.headingStyleCount))} to ${Math.max(...pages.map(page => page.typography.headingStyleCount))} across pages.`);
    set("design-27", every(pages, page => page.typography.minTextSize >= (page.strategy === "mobile" ? 12 : 14)) ? "pass" : "fail", `Smallest rendered text is ${Math.min(...pages.map(page => page.typography.minTextSize))}px.`);
    set("design-28", every(pages, page => page.content.headingAboveFold && page.content.actionAboveFold) ? "pass" : "fail", "The first viewport was checked for both a clear heading and an actionable control.");
    set("design-29", every(pages, page => page.content.sectionCount > 0 || page.content.mainLandmark) ? "pass" : "fail", "Rendered pages were checked for semantic main content and grouped sections.");
    set("design-31", some(pages, page => page.controls.distinctStyles >= 2) ? "pass" : "fail", "Primary and secondary control treatments were compared from computed styles.");
    set("design-36", avg(pages.map(page => page.controls.semanticRatio)) >= 90 ? "pass" : "fail", `${avg(pages.map(page => page.controls.semanticRatio))}% of interactive controls use familiar semantic elements.`);
    set("design-38", every(pages, page => page.content.sectionCount > 0 || page.content.mainLandmark) ? "pass" : "fail", "Semantic sections and main-content grouping were inspected on every rendered page.");
    set("design-39", every(desktop, page => page.navigation.visible && page.navigation.linkCount > 1) ? "pass" : "fail", "Desktop navigation and menu relationships were inspected on every rendered page.");
    set("design-40", every(pages, page => page.content.headingAboveFold) ? "pass" : "fail", "The first viewport of each rendered page was checked for important heading content.");
    set("design-44", avg(pages.map(page => page.images.altRatio)) >= 90 ? "pass" : "fail", `Image alternative-text coverage is ${avg(pages.map(page => page.images.altRatio))}%.`);
    set("design-45", avg(pages.map(page => page.images.highResolutionRatio)) >= 80 ? "pass" : "fail", `${avg(pages.map(page => page.images.highResolutionRatio))}% of rendered images meet their displayed pixel density.`);
    set("design-46", avg(pages.map(page => page.images.dimensionedRatio)) >= 80 ? "pass" : "fail", `${avg(pages.map(page => page.images.dimensionedRatio))}% of images have stable rendered dimensions.`);

    set("navigation-02", every(desktop, page => page.navigation.visible && page.navigation.nearTop) ? "pass" : "fail", "Navigation was rendered near the top of each desktop page.");
    set("navigation-03", some(pages, page => page.navigation.hasCurrentPage) ? "pass" : "fail", "Rendered navigation was checked for aria-current or an active-page state.");
    set("navigation-04", some(pages, page => page.content.addressPresent) ? "pass" : "not_applicable", some(pages, page => page.content.addressPresent) ? "A physical address is visible." : "No location-dependent service requirement was established from the audited pages.");
    set("navigation-05", some(pages, page => page.content.phoneOrEmailPresent || page.navigation.hasSupport) ? "pass" : "fail", "Visible support email, phone, or help navigation was checked across the audited pages.");
    set("navigation-06", every(desktop, page => page.navigation.hasAbout) ? "pass" : "fail", "The About or story route was checked in desktop navigation.");
    set("navigation-08", every(desktop, page => page.navigation.visible) ? "pass" : "fail", `${desktop.filter(page => page.navigation.visible).length} of ${desktop.length} desktop pages expose navigation.`);
    set("navigation-12", every(desktop, page => page.footer.visible && page.footer.linkCount >= 3) ? "pass" : "fail", "Footer link coverage was inspected on every desktop page.");
    set("navigation-14", every(pages, page => page.navigation.visible) ? "pass" : "fail", "Visible navigation landmarks were checked across desktop and mobile renders.");
    set("navigation-15", every(desktop, page => page.navigation.visible && page.navigation.linkCount >= 3) ? "pass" : "fail", "Desktop navigation remains visible and contains direct links.");
    set("navigation-17", every(pages, page => page.navigation.hasHomeLogo) ? "pass" : "fail", "The header logo/home link relationship was checked on every rendered page.");

    set("accessibility-03", pages.some(page => page.controls.disabledCount > 0) ? (pages.every(page => page.controls.disabledCount === 0 || page.controls.explainedDisabledCount > 0) ? "pass" : "fail") : "not_applicable", "Rendered disabled-control states and explanatory attributes were inspected.");
    set("accessibility-04", bundle.technical.https ? "pass" : "fail", `The audited URL uses ${bundle.technical.https ? "HTTPS" : "HTTP"}.`);
    set("accessibility-08", pages.some(page => page.controls.disabledCount > 0) ? (pages.every(page => page.controls.disabledCount === page.controls.explainedDisabledCount) ? "pass" : "fail") : "not_applicable", "Disabled controls were checked for titles, descriptions, or tooltips.");
    set("accessibility-12", bundle.technical.notFoundHelpful === null ? "unverified" : bundle.technical.notFoundHelpful ? "pass" : "fail", "A non-existent route was requested and its HTTP response was inspected.");
    set("accessibility-17", some(pages, page => page.content.pricePresent) ? "pass" : "not_applicable", some(pages, page => page.content.pricePresent) ? "Prices are visible on the rendered commerce pages." : "No paid offer was found on the audited pages.");
    set("accessibility-07", some(pages, page => page.content.pricePresent) ? "pass" : "not_applicable", some(pages, page => page.content.pricePresent) ? "Rendered prices use recognizable currency formatting." : "No currency or price data was found on the audited pages.");
    set("accessibility-22", hasForms ? (avg(pages.map(page => page.forms.visibleLabelsRatio)) >= 90 ? "pass" : "fail") : "not_applicable", `Visible-label coverage is ${avg(pages.map(page => page.forms.visibleLabelsRatio))}% across rendered fields.`);
    set("accessibility-24", hasForms ? (avg(pages.map(page => page.forms.autocompleteRatio)) >= 60 ? "pass" : "fail") : "not_applicable", `Browser-autofill attribute coverage is ${avg(pages.map(page => page.forms.autocompleteRatio))}%.`);
    set("accessibility-25", hasForms ? (avg(pages.map(page => page.forms.visibleLabelsRatio)) >= 90 ? "pass" : "fail") : "not_applicable", "Persistent visible labels were measured independently from placeholder text.");
    set("accessibility-26", hasForms ? (avg(pages.map(page => page.forms.usefulInputTypeRatio)) >= 90 ? "pass" : "fail") : "not_applicable", `${avg(pages.map(page => page.forms.usefulInputTypeRatio))}% of fields use a context-appropriate input type.`);
    for (let index = 27; index <= 37; index += 1) if (!hasLogin) set(`accessibility-${String(index).padStart(2, "0")}`, "not_applicable", "No login or registration screen was included in the public audited pages.");
    set("accessibility-38", avg(mobile.map(page => page.controls.undersized === 0 ? 100 : Math.max(0, 100 - page.controls.undersized * 5))) >= 80 ? "pass" : "fail", `${mobile.reduce((sum, page) => sum + page.controls.undersized, 0)} undersized controls were found in mobile rendering.`);
    set("accessibility-39", avg(pages.map(page => page.controls.semanticRatio)) >= 90 ? "pass" : "fail", `${avg(pages.map(page => page.controls.semanticRatio))}% of controls use keyboard-compatible semantic elements.`);
    set("accessibility-43", some(pages, page => page.content.faqPresent) ? "pass" : "not_applicable", some(pages, page => page.content.faqPresent) ? "FAQ content is present on an audited page." : "No FAQ surface was found on the audited pages.");

    set("mobile-01", every(mobile, page => page.typography.bodyFontSize >= 16) ? "pass" : "fail", `Mobile body text ranges from ${Math.min(...mobile.map(page => page.typography.bodyFontSize))}px to ${Math.max(...mobile.map(page => page.typography.bodyFontSize))}px.`);
    set("mobile-02", every(mobile, page => !page.viewport.horizontalOverflow) ? "pass" : "fail", `${mobile.filter(page => page.viewport.horizontalOverflow).length} of ${mobile.length} mobile pages overflow horizontally.`);
    set("mobile-03", avg(mobile.map(page => page.controls.undersized === 0 ? 100 : 0)) >= 80 ? "pass" : "fail", `${mobile.reduce((sum, page) => sum + page.controls.undersized, 0)} mobile controls fall below the 40px target.`);
    set("mobile-04", avg(mobile.map(page => page.controls.undersized === 0 ? 100 : 0)) >= 80 ? "pass" : "fail", "Mobile control dimensions were measured across every rendered page.");
    set("mobile-05", hasForms ? (avg(mobile.map(page => page.forms.usefulInputTypeRatio)) >= 90 ? "pass" : "fail") : "not_applicable", `Appropriate mobile input-type coverage is ${avg(mobile.map(page => page.forms.usefulInputTypeRatio))}%.`);
    set("mobile-06", every(mobile, page => page.content.actionAboveFold) ? "pass" : "fail", "Each mobile first viewport was checked for a reachable important action.");
    set("mobile-07", "not_applicable", "No contextual phone hardware permission flow was required on the audited public pages.");
    set("mobile-08", hasGallery ? "unverified" : "not_applicable", hasGallery ? "A product gallery is present, but gesture behavior requires a focused interaction test." : "No image gallery was found.");

    set("seo-01", bundle.technical.httpRedirectsToHttps === null ? "unverified" : bundle.technical.httpRedirectsToHttps ? "pass" : "fail", "The HTTP version was requested directly and its redirect destination was checked.");
    set("seo-02", bundle.technical.hostRedirectConsistent === null ? "unverified" : bundle.technical.hostRedirectConsistent ? "pass" : "fail", "The alternate www/non-www hostname was requested and checked for canonical redirection.");
    set("seo-05", pages.some(page => /noindex/i.test(page.metadata.robots)) ? "pass" : "unverified", pages.some(page => /noindex/i.test(page.metadata.robots)) ? "A noindex directive was found on a rendered page." : "Robots metadata was inspected, but deciding which additional pages should be excluded requires a content-owner review.");
    set("seo-06", every(mobile, page => !page.viewport.horizontalOverflow && page.typography.bodyFontSize >= 16) ? "pass" : "fail", "Rendered mobile pages were checked for readable body text and horizontal overflow.");
    set("seo-10", bundle.technical.notFoundHelpful === null ? "unverified" : bundle.technical.notFoundHelpful ? "pass" : "fail", "A unique non-existent URL was checked for a proper 404 response.");
    set("seo-11", bundle.technical.brokenLinks.length === 0 ? "pass" : "fail", `${bundle.technical.brokenLinksChecked} representative internal pages were checked; ${bundle.technical.brokenLinks.length} returned an error.`);
    set("seo-16", every(desktop, page => page.navigation.linkCount >= 3) ? "pass" : "fail", "Important-page link coverage was inspected in rendered desktop navigation.");
    set("seo-17", desktop.length >= 3 && every(desktop, page => page.navigation.visible) ? "pass" : "fail", `${desktop.length} public pages were reached from the site crawl and retain visible navigation.`);
    set("seo-18", desktop.length >= 3 ? "pass" : "fail", `${desktop.length} audited pages provide a concrete site-structure sample.`);
    set("seo-19", bundle.technical.sitemapAvailable ? "pass" : "fail", `The sitemap.xml endpoint ${bundle.technical.sitemapAvailable ? "is available" : "was not available"}.`);
    set("seo-20", some(pages, page => page.metadata.hasAnalytics) ? "pass" : "fail", "Rendered scripts were inspected for a recognized analytics integration.");
  }
  for (const run of lighthouse) {
    set(run.strategy === "mobile" ? "seo-07" : "seo-08", "pass", `Lighthouse ${run.strategy} performance score: ${run.scores.performance}/100.`, run.testedUrl);
    set("seo-09", "pass", `Lighthouse technical issues were recorded with version ${run.lighthouseVersion}.`, run.testedUrl);
    set("seo-14", "pass", `Lighthouse accessibility score: ${run.scores.accessibility}/100.`, run.testedUrl);
    set("seo-15", "pass", "Lighthouse color-contrast audits were included in the accessibility run.", run.testedUrl);
    const contrastFailure = run.insights?.some(insight => insight.id === "color-contrast");
    set("accessibility-02", contrastFailure ? "fail" : "pass", contrastFailure ? `Lighthouse ${run.strategy} found insufficient foreground/background contrast.` : `Lighthouse ${run.strategy} found no scored color-contrast failure; accessibility score is ${run.scores.accessibility}/100.`, run.testedUrl);
  }
  return checks;
}
