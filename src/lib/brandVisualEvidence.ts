import type { BrandColorEvidence, BrandVisualEvidence } from "./aiStageGeneration";
import type { WebsiteEvidenceBundle } from "./renderedWebsiteEvidence";

export function brandVisualsFromEvidence(evidence: WebsiteEvidenceBundle): BrandVisualEvidence {
  const desktopPages = evidence.rendered.filter(page => page.strategy === "desktop");
  const sourcePages = desktopPages.length ? desktopPages : evidence.rendered;
  const colors = new Map<string, { score: number; contexts: Set<string> }>();
  const rankedFonts = (kind: "headingFonts" | "bodyFonts") => {
    const counts = new Map<string, number>();
    sourcePages.forEach(page => page.visualIdentity[kind].forEach((font, index) => counts.set(font, (counts.get(font) || 0) + Math.max(1, 6 - index))));
    return [...counts].sort((left, right) => right[1] - left[1]).map(([font]) => font);
  };
  sourcePages.forEach(page => page.visualIdentity.colors.forEach(color => {
    const current = colors.get(color.hex) || { score: 0, contexts: new Set<string>() };
    current.score += color.count;
    color.contexts.forEach(context => current.contexts.add(context));
    colors.set(color.hex, current);
  }));
  const ranked = [...colors].map(([hex, value]) => {
    const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
    const max = Math.max(...channels), min = Math.min(...channels);
    return { hex, ...value, lightness: (max + min) / 2, saturation: max === min ? 0 : (max - min) / (1 - Math.abs(max + min - 1)) };
  }).sort((left, right) => right.score - left.score);
  const distance = (left: string, right: string) => Math.sqrt([1, 3, 5].reduce((sum, index) => sum + Math.pow(parseInt(left.slice(index, index + 2), 16) - parseInt(right.slice(index, index + 2), 16), 2), 0));
  const dark = ranked.find(color => color.lightness < 0.24 && color.saturation >= 0.08 && color.contexts.has("text"))
    || ranked.find(color => color.lightness < 0.24 && color.contexts.has("text"));
  const light = ranked.find(color => color.lightness > 0.9 && color.contexts.has("background"));
  const chromatic = ranked.filter(color => color.saturation >= 0.18 && color.lightness >= 0.24 && color.lightness <= 0.9);
  const primary = chromatic[0];
  const secondary = chromatic.find(color => !primary || distance(color.hex, primary.hex) >= 70);
  const accent = chromatic.find(color => (!primary || distance(color.hex, primary.hex) >= 70) && (!secondary || distance(color.hex, secondary.hex) >= 70));
  const selected: Array<[BrandColorEvidence["role"], typeof ranked[number] | undefined]> = [
    ["Primary", primary], ["Ink", dark], ["Secondary", secondary], ["Accent", accent], ["Paper", light],
  ];
  const observed = new Set<string>();
  const verifiedColors = selected.flatMap(([role, color]) => {
    if (!color || observed.has(color.hex)) return [];
    observed.add(color.hex);
    return [{ role, hex: color.hex, evidence: `Computed from ${[...color.contexts].join(", ")} styles on the live website.` } satisfies BrandColorEvidence];
  });
  const sourceUrl = sourcePages[0]?.url || null;
  const displayFont = sourcePages[0]?.visualIdentity.headingFonts[0] || rankedFonts("headingFonts")[0] || null;
  const bodyFont = sourcePages[0]?.visualIdentity.bodyFonts[0] || rankedFonts("bodyFonts")[0] || null;
  const logoUrl = sourcePages.map(page => page.visualIdentity.logoUrl).find(Boolean) || null;
  return { status: verifiedColors.length || displayFont || bodyFont ? "verified" : "unverified", sourceUrl, colors: verifiedColors, displayFont, bodyFont, logoUrl };
}
