"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";

const TARGET_TILE = 152; // ~9.5rem preferred tile width

// Wraps the snapshot metric tiles in a looping, snap-scrolling carousel with
// prev/next arrows that overlap the card edges. Tiles are sized so a whole
// number always fills the row exactly — so every visible card is complete and
// nothing is ever clipped/bled at the edges. Each arrow advances one tile.
export function StatsCarousel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  const layout = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const avail = el.clientWidth;
    const count = el.children.length;
    // How many whole tiles fit; size each so exactly that many fill the row.
    const perView = Math.max(1, Math.min(count, Math.round((avail + gap) / (TARGET_TILE + gap))));
    const width = (avail - (perView - 1) * gap) / perView;
    el.style.setProperty("--stat-tile-w", width + "px");
    setOverflowing(count > perView);
  }, []);

  useEffect(() => {
    layout();
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(layout);
    observer.observe(el);
    return () => observer.disconnect();
  }, [layout]);

  const scroll = (direction: number) => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const step = (first?.offsetWidth || 0) + gap;
    if (step <= 0) return;
    const max = el.scrollWidth - el.clientWidth; // an exact multiple of step
    const current = Math.round(el.scrollLeft / step);
    // Rest only on exact tile boundaries (never a partial tile) and loop.
    const target = direction > 0
      ? ((current + 1) * step > max + 1 ? 0 : (current + 1) * step)
      : (current <= 0 ? Math.floor((max + 1) / step) * step : (current - 1) * step);
    el.scrollTo({ left: target, behavior: "smooth" });
  };

  const arrow = (side: "left" | "right", icon: string, label: string, direction: number) => (
    <button type="button" aria-label={label} onClick={() => scroll(direction)} className="pt-iconbtn" style={css("position:absolute;top:50%;transform:translateY(-50%);" + side + ":0.45rem;z-index:2;width:1.85rem;height:1.85rem;border-radius:50%;border:1px solid var(--border);background:color-mix(in srgb,var(--surface) 88%,transparent);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer;box-shadow:0 2px 9px color-mix(in srgb,var(--fg) 16%,transparent 84%)")}>
      <Icon name={icon} size={14} />
    </button>
  );

  return (
    <div style={css("position:relative")}>
      <div ref={ref} className="pt-snapshot-stats" role="region" aria-label="Snapshot metrics" style={css("gap:0.55rem")}>
        {children}
      </div>
      {overflowing && <>{arrow("left", "chevleft", "Previous metrics", -1)}{arrow("right", "chevright", "Next metrics", 1)}</>}
    </div>
  );
}
