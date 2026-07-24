"use client";

import type { ReactNode } from "react";
import { css } from "../helpers";
import { ClientPickerGrid, type ClientCardData } from "./ClientPickerGrid";

export function GuidedIntakeSelector({
  eyebrow,
  eyebrowColor,
  title,
  description,
  controls,
  overview,
  controlsBelow = false,
  cards,
  countLabel,
}: {
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  description: string;
  controls: ReactNode;
  overview?: ReactNode;
  controlsBelow?: boolean;
  cards: ClientCardData[];
  countLabel?: string;
}) {
  return (
    <div className="pt-engine-index-shell" style={css("display:flex;flex-direction:column;gap:var(--space-4)")}>
      <div className="pt-engine-index-hero" data-controls-below={controlsBelow ? "true" : "false"}>
        <div className="pt-engine-index-copy">
          <span style={css("text-transform:uppercase;font-size:var(--text-label);font-weight:400;letter-spacing:0.04em;line-height:1.2;display:block;color:" + eyebrowColor + ";margin-bottom:0.45rem")}>{eyebrow}</span>
          <h2 style={css("margin:0;font-size:var(--text-2xl);font-weight:500;line-height:1.15")}>{title}</h2>
          <p style={css("margin:0.45rem 0 0;font-size:var(--text-base);color:var(--fg-muted);line-height:1.55;max-width:36rem")}>{description}</p>
          <div className="pt-engine-index-actions">{controls}</div>
        </div>
        {overview && <div className="pt-engine-index-overview">
          <span className="pt-engine-index-overview-label">At a glance</span>
          <div className="pt-engine-index-overview-controls">{overview}</div>
        </div>}
      </div>

      <ClientPickerGrid cards={cards} countLabel={countLabel} />
    </div>
  );
}
