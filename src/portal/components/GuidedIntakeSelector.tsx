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
  cards,
  countLabel,
}: {
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  description: string;
  controls: ReactNode;
  cards: ClientCardData[];
  countLabel?: string;
}) {
  return (
    <div style={css("display:flex;flex-direction:column;gap:var(--space-4)")}>
      <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;padding:1rem 1.1rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface)")}>
        <div style={{ minWidth: 0 }}>
          <span style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;display:block;color:" + eyebrowColor + ";margin-bottom:0.45rem")}>{eyebrow}</span>
          <h2 style={css("margin:0;font-size:1.22rem;font-weight:500;line-height:1.15")}>{title}</h2>
          <p style={css("margin:0.45rem 0 0;font-size:var(--text-base);color:var(--fg-muted);line-height:1.55;max-width:36rem")}>{description}</p>
        </div>
        <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap;flex-shrink:0")}>
          {controls}
        </div>
      </div>

      <ClientPickerGrid cards={cards} countLabel={countLabel} />
    </div>
  );
}
