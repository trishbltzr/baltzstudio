import { NextRequest, NextResponse } from "next/server";
import puppeteer, { type Browser } from "puppeteer-core";

export const runtime = "nodejs";
export const maxDuration = 60;

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === request.nextUrl.host; } catch { return false; }
}

async function launchBrowser(): Promise<Browser> {
  const localChrome = process.env.CHROME_PATH || (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "");
  if (localChrome) return puppeteer.launch({ executablePath: localChrome, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
  const { default: chromium } = await import("@sparticuz/chromium");
  return puppeteer.launch({ executablePath: await chromium.executablePath(), headless: true, args: chromium.args });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const html = typeof body?.html === "string" ? body.html : "";
  const title = typeof body?.title === "string" ? body.title.slice(0, 160) : "Report";
  const pageless = body?.pageless !== false;
  if (!html || html.length > 2_000_000) return NextResponse.json({ error: "The report preview is missing or too large." }, { status: 400 });
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    if (pageless) await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", intercepted => {
      const url = intercepted.url();
      if (url.startsWith("data:") || url.startsWith("about:") || url.startsWith(request.nextUrl.origin)) void intercepted.continue();
      else void intercepted.abort();
    });
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.evaluate(() => (document as Document & { fonts?: FontFaceSet }).fonts?.ready);
    await page.emulateMediaType("print");
    const pagelessHeight = pageless
      ? await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight))
      : null;
    if (pagelessHeight && pagelessHeight > 18_000) throw new Error("The pageless report exceeds the supported document height.");
    const pdf = pageless
      ? await page.pdf({
          width: "210mm",
          height: `${Math.max(pagelessHeight || 0, 1123)}px`,
          printBackground: true,
          preferCSSPageSize: false,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
        })
      : await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" } });
    const fileName = `${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "report"}.pdf`;
    return new NextResponse(Buffer.from(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${fileName}"`, "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create the PDF." }, { status: 500 });
  } finally {
    await browser?.close().catch(() => undefined);
  }
}
