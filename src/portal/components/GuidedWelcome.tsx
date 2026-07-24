"use client";

import type { ReactNode } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";

export interface GuidedWelcomeListItem {
  number: string;
  title: string;
  tag: string;
}

export function GuidedWelcome({
  mobile,
  accent,
  eyebrow,
  title,
  description,
  listHeading,
  listItems,
  preview,
  previewLeft,
  previewWidthDesktop = "38rem",
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  mobile: boolean;
  accent: string;
  eyebrow: string;
  title: string;
  description: string;
  listHeading: string;
  listItems: GuidedWelcomeListItem[];
  preview: ReactNode;
  // When set, the preview is anchored from the left (left edge + gauges visible,
  // cropped on the right) instead of the default right-anchored pop-out.
  previewLeft?: string;
  previewWidthDesktop?: string;
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  const heroGrid = mobile ? "1fr" : "minmax(0,0.97fr) minmax(24rem,0.93fr)";
  const accentGlow = "color-mix(in srgb," + accent + " 12%,transparent 88%)";
  const accentLine = "color-mix(in srgb," + accent + " 28%,white 72%)";
  const accentPanel = "color-mix(in srgb," + accent + " 7%,white 93%)";
  const outerPad = mobile ? "1rem" : "1.6rem";
  const introPad = mobile ? "0.55rem 0.5rem 0.25rem" : "0.95rem 0.9rem 0.45rem";
  const previewHeight = mobile ? "25.5rem" : "42rem";
  const previewOffset = mobile ? "-1rem" : "-7rem";
  const previewWidth = mobile ? "calc(100% + 1.6rem)" : previewWidthDesktop;
  const previewAnchor = !mobile && previewLeft ? "left:" + previewLeft : "right:" + previewOffset;

  const previewBody = (
    <div style={css("position:absolute;" + previewAnchor + ";top:" + (mobile ? "1rem" : "2.8rem") + ";width:" + previewWidth + ";pointer-events:none")}>
      {preview}
    </div>
  );

  return (
    <div style={{ animation: "cocoonFade .24s ease" }}>
      <div style={css("position:relative;overflow:hidden;padding:" + outerPad + ";border:1px solid color-mix(in srgb,var(--border-soft) 80%,white 20%);border-radius:" + (mobile ? "1.5rem" : "1.9rem") + ";background:linear-gradient(180deg,color-mix(in srgb,var(--surface) 44%,white 56%) 0%,color-mix(in srgb,var(--bg) 82%,white 18%) 100%)")}>
        <div style={css("position:absolute;left:-4rem;top:-4.2rem;width:" + (mobile ? "10rem" : "13rem") + ";height:" + (mobile ? "10rem" : "13rem") + ";border-radius:50%;background:color-mix(in srgb," + accent + " 10%,white 90%);opacity:.72")} />
        <div style={css("position:absolute;right:-5rem;bottom:-5rem;width:" + (mobile ? "11rem" : "15rem") + ";height:" + (mobile ? "11rem" : "15rem") + ";border-radius:50%;background:color-mix(in srgb," + accent + " 8%,white 92%);opacity:.8")} />

        <div style={css("position:relative;display:grid;grid-template-columns:" + heroGrid + ";gap:" + (mobile ? "1rem" : "1.65rem") + ";align-items:start")}>
          <div style={css("padding:" + introPad)}>
            <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;display:inline-flex;align-items:center;gap:0.62rem;color:" + accent + ";font-size:" + (mobile ? "0.68rem" : "0.74rem") + ";margin-bottom:" + (mobile ? "0.9rem" : "1.15rem"))}>
              <span style={css("width:0.58rem;height:0.58rem;border-radius:50%;background:" + accent)} />
              {eyebrow}
            </div>

            <h1 style={css("font-size:" + (mobile ? "2rem" : "3.1rem") + ";font-weight:500;line-height:" + (mobile ? "1.02" : "0.98") + ";letter-spacing:-0.045em;max-width:" + (mobile ? "none" : "33rem") + ";margin:0 0 " + (mobile ? "0.8rem" : "1rem"))}>{title}</h1>
            <p style={css("margin:0;max-width:" + (mobile ? "none" : "30rem") + ";font-size:" + (mobile ? "1rem" : "1.02rem") + ";line-height:1.58;color:var(--fg-muted)")}>{description}</p>

            <div style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;margin-top:" + (mobile ? "1.2rem" : "1.6rem") + ";margin-bottom:0.7rem;font-size:" + (mobile ? "0.72rem" : "0.78rem") + ";color:var(--fg-faint)")}>{listHeading}</div>

            <div style={css("overflow:hidden;border:1px solid color-mix(in srgb,var(--border-soft) 82%,white 18%);border-radius:1.3rem;background:color-mix(in srgb,var(--surface) 95%,white 5%)")}>
              {listItems.map((item, index) => (
                <div key={item.number + item.title} style={css("display:flex;align-items:center;gap:0.9rem;padding:" + (mobile ? "0.9rem 0.95rem" : "1rem 1.05rem") + (index ? ";border-top:1px solid color-mix(in srgb,var(--border-soft) 76%,white 24%)" : ""))}>
                  <span style={css("width:" + (mobile ? "2rem" : "2.2rem") + ";height:" + (mobile ? "2rem" : "2.2rem") + ";border-radius:50%;display:grid;place-items:center;flex-shrink:0;border:1px solid color-mix(in srgb,var(--border-soft) 88%,white 12%);background:var(--surface);font-size:" + (mobile ? "0.86rem" : "0.92rem") + ";font-weight:500;color:var(--fg-muted)")}>{item.number}</span>
                  <span style={css("font-size:" + (mobile ? "1rem" : "1.02rem") + ";font-weight:500;line-height:1.2;color:var(--fg)")}>{item.title}</span>
                  <span style={css("margin-left:auto;display:inline-flex;align-items:center;justify-content:center;padding:0.32rem 0.74rem;border-radius:999px;background:color-mix(in srgb,var(--surface-alt) 70%,white 30%);font-size:" + (mobile ? "0.74rem" : "0.78rem") + ";font-weight:500;color:var(--fg-muted);white-space:nowrap")}>{item.tag}</span>
                </div>
              ))}
            </div>

            <div style={css("display:flex;flex-direction:column;gap:0.55rem;margin-top:" + (mobile ? "1rem" : "1.15rem") + ";max-width:" + (mobile ? "100%" : "31rem"))}>
              <button type="button" onClick={onPrimary} style={css("display:inline-flex;align-items:center;justify-content:center;gap:0.45rem;min-height:" + (mobile ? "3rem" : "3.3rem") + ";width:100%;padding:0 1.4rem;border:0;border-radius:1.1rem;background:linear-gradient(90deg," + accent + ",color-mix(in srgb," + accent + " 72%,white 28%));color:#fff;font-size:" + (mobile ? "1rem" : "0.98rem") + ";font-weight:500;cursor:pointer")}>{primaryLabel} <Icon name="arrow" size={15} /></button>
            </div>
          </div>

          <div style={css("position:relative;min-height:" + previewHeight + ";overflow:hidden;border-radius:" + (mobile ? "1.25rem" : "1.7rem") + ";background:linear-gradient(180deg,color-mix(in srgb,var(--surface) 42%,white 58%) 0%,color-mix(in srgb,var(--surface-alt) 70%,white 30%) 100%);border:1px solid color-mix(in srgb,var(--border-soft) 76%,white 24%)")}>
            <div style={css("position:absolute;right:" + (mobile ? "-0.5rem" : "0.6rem") + ";top:" + (mobile ? "0.6rem" : "1.4rem") + ";width:" + (mobile ? "92%" : "86%") + ";height:" + (mobile ? "86%" : "88%") + ";border-radius:1.35rem;background:" + accentPanel + ";border:1px solid " + accentLine + ";opacity:.52")} />

            {onSecondary && secondaryLabel ? (
              <button
                type="button"
                onClick={onSecondary}
                style={css("position:absolute;inset:0;border:none;background:transparent;padding:0;cursor:pointer;text-align:left")}
                aria-label={secondaryLabel}
              >
                {previewBody}
              </button>
            ) : previewBody}

            {onSecondary && secondaryLabel && (
              <button type="button" onClick={onSecondary} style={css("position:absolute;left:" + (mobile ? "0.8rem" : "1rem") + ";bottom:" + (mobile ? "0.8rem" : "1rem") + ";display:inline-flex;align-items:center;gap:0.38rem;padding:0.42rem 0.78rem;border:1px solid color-mix(in srgb,var(--border-soft) 84%,white 16%);border-radius:999px;background:color-mix(in srgb,var(--surface) 88%,white 12%);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer")}><Icon name="eye" size={13} />{secondaryLabel}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
