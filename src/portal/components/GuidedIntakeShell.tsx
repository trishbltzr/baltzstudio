"use client";

import type { CSSProperties, ReactNode } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";

export interface GuidedPipelineItem {
  key: string;
  title: string;
  done?: boolean;
  active?: boolean;
  reachable?: boolean;
  final?: boolean;
  onClick: () => void;
}

export interface GuidedPipelineSection {
  label: string;
  items: GuidedPipelineItem[];
}

export function GuidedPipelinePanel({
  mobile,
  title,
  onBack,
  sections,
  footer,
  accentColor,
  activeBackground,
  finalBackground,
  finalColor,
  desktopWidth = "17.5rem",
  style,
}: {
  mobile: boolean;
  title: string;
  onBack: () => void;
  sections: GuidedPipelineSection[];
  footer?: ReactNode;
  accentColor: string;
  activeBackground: string;
  finalBackground: string;
  finalColor: string;
  desktopWidth?: string;
  style?: CSSProperties;
}) {
  const headerIconLane = "1.9rem";
  return (
    <aside style={{ ...css("width:" + (mobile ? "100%" : desktopWidth) + ";height:" + (mobile ? "auto" : "100vh") + ";flex-shrink:0;background:color-mix(in srgb,var(--surface) 95%,white 5%);border-right:1px solid color-mix(in srgb,var(--border-soft) 72%,white 28%);display:flex;flex-direction:column;min-height:0;overflow:hidden"), ...style }}>
      <div style={css("display:flex;flex-direction:column;flex:1;min-height:0")}>
        <div style={css("position:sticky;top:0;z-index:2;min-height:calc(3.96rem + 1px);padding:0.48rem 1rem;border-bottom:1px solid color-mix(in srgb,var(--border-soft) 80%,white 20%);display:flex;align-items:center;background:linear-gradient(180deg,color-mix(in srgb,var(--surface) 96%,white 4%),color-mix(in srgb,var(--surface-alt) 70%,white 30%))")}>
          <button
            type="button"
            onClick={onBack}
            className="pt-softbtn"
            style={css("display:flex;align-items:flex-start;gap:0.6rem;width:100%;padding:0;border:0;background:transparent;text-align:left;cursor:pointer")}
          >
            <span style={css("width:" + headerIconLane + ";height:" + headerIconLane + ";display:grid;place-items:center;flex-shrink:0;color:var(--fg-muted)")}>
              <Icon name="chevleft" size={16} />
            </span>
            <div>
              <div style={css("display:block;font-size:0.7rem;font-weight:500;color:var(--fg-muted);margin:0 0 0.3rem")}>All clients</div>
              <div style={css("font-size:0.9rem;font-weight:500;line-height:1.2;color:var(--fg)")}>{title}</div>
            </div>
          </button>
        </div>
        <div style={css("flex:1;overflow-y:auto;padding:0.6rem 0.55rem 0.85rem")}>
          {sections.map(section => (
            <div key={section.label} style={css("margin-bottom:0.45rem")}>
              <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;padding:0.6rem 0.85rem 0.38rem;color:var(--fg-faint)")}>{section.label}</div>
              {section.items.map(item => {
                const dot = item.done
                  ? "background:var(--success);border:1px solid var(--success);color:#fff"
                  : item.active ? "background:transparent;border:1.5px dashed " + accentColor
                    : item.reachable ? "background:transparent;border:1.5px solid var(--border)" : "background:transparent;border:1.5px solid var(--border-soft)";
                return (
                  <button key={item.key} type="button" onClick={item.onClick} disabled={!item.reachable && !item.done && !item.active} style={css("width:100%;display:flex;align-items:center;gap:0.6rem;padding:0.58rem 0.85rem;border:1px solid " + (item.active ? "color-mix(in srgb," + accentColor + " 26%,white 74%)" : "transparent") + ";border-radius:999px;background:" + (item.active ? activeBackground : "transparent") + ";cursor:" + (item.reachable || item.done || item.active ? "pointer" : "default") + ";text-align:left")}>
                    <span style={css("width:0.92rem;height:0.92rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;" + dot)}>{item.done && <Icon name="checkmark" size={8} />}</span>
                    <span style={css("flex:1;min-width:0;font-size:0.78rem;font-weight:" + (item.active ? "500" : "400") + ";color:" + (item.reachable || item.done || item.active ? "var(--fg)" : "var(--fg-faint)") + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{item.title}</span>
                    {item.final && <span style={css("flex-shrink:0;padding:0.05rem 0.4rem;border-radius:999px;background:" + finalBackground + ";color:" + finalColor + ";font-size:0.58rem;font-weight:500")}>Final</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {footer && <div style={css("padding:0.9rem 1rem;border-top:1px solid color-mix(in srgb,var(--border-soft) 80%,white 20%);background:linear-gradient(180deg,color-mix(in srgb,var(--surface) 90%,white 10%),color-mix(in srgb,var(--surface-alt) 68%,white 32%))")}>{footer}</div>}
      </div>
    </aside>
  );
}

export function GuidedIntakeShell({
  mobile,
  panel,
  showPanel = true,
  replaceSidebar = false,
  hideInlineBand = false,
  bandDotBackground,
  bandPrimary,
  bandSecondary,
  contentMaxWidth,
  fullBleedBand = false,
  topReserve = "0",
  accent = "var(--accent)",
  children,
  footer,
}: {
  mobile: boolean;
  panel?: ReactNode;
  showPanel?: boolean;
  replaceSidebar?: boolean;
  hideInlineBand?: boolean;
  bandDotBackground: string;
  bandPrimary: string;
  bandSecondary: string;
  contentMaxWidth: string;
  fullBleedBand?: boolean;
  // Accent for focus rings / hover polish inside the guided flow.
  accent?: string;
  // Height of the shell top bar to tuck the guided view beneath, so the sidebar
  // spans the full column (heading at top, footer visible) and the bar sits to
  // its right. "0" (default) leaves the section in normal flow.
  topReserve?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reserved = !mobile && topReserve !== "0";
  const contentPadding = mobile ? "1.2rem 1rem 1.5rem" : "1.6rem 2rem 2.4rem";
  const scrollPanePadding = fullBleedBand ? "0" : contentPadding;
  const bandMargin = fullBleedBand ? "0 0 1.1rem" : "0 0 1rem";
  const bandPadding = fullBleedBand ? "0.9rem 1.1rem" : "0.38rem 0.72rem";
  const bandRadius = fullBleedBand ? "0" : "999px";
  const bandBorder = fullBleedBand
    ? "border-bottom:1px solid var(--border-soft);"
    : "border:1px solid color-mix(in srgb,var(--border-soft) 76%,white 24%);";
  const contentWrapPadding = fullBleedBand ? "padding:" + contentPadding + ";" : "";
  const sidebarReplacement = replaceSidebar && !mobile && panel
    ? <div style={css("position:fixed;top:0;left:0;width:16rem;height:100vh;height:100dvh;z-index:21")}>{panel}</div>
    : null;

  return (
    <>
      {sidebarReplacement}
      <section className="pt-guided" style={css("--success:oklch(0.56 0.12 155);--guided-accent:" + accent + ";width:100%;height:" + (reserved ? "100dvh" : "100%") + ";min-height:" + (mobile ? "34rem" : "40rem") + ";" + (reserved ? "margin-top:calc(-1 * " + topReserve + ");" : "") + "display:flex;" + (mobile ? "flex-direction:column;" : "") + "background:var(--bg);overflow:hidden;border:1px solid var(--border-soft);border-radius:0")}>
        {showPanel && !replaceSidebar ? panel : null}
        <div style={css("flex:1;min-width:0;display:flex;flex-direction:column;min-height:0;background:var(--bg)")}>
        <div style={css("flex:1;min-height:0;overflow-y:auto;padding:" + scrollPanePadding + ";display:flex;flex-direction:column" + (reserved ? ";padding-top:calc(" + topReserve + " + 0.6rem)" : ""))}>
          <div style={css(contentWrapPadding)}>
            <div style={css("width:100%;max-width:" + contentMaxWidth + ";margin:0 auto")}>
              {!hideInlineBand && <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;margin:" + bandMargin + ";padding:" + bandPadding + ";border-radius:" + bandRadius + ";background:color-mix(in srgb,var(--surface) 88%,white 12%);" + bandBorder)}>
                <div style={css("display:flex;align-items:center;gap:0.55rem;min-width:0")}>
                  <span style={css("width:1.1rem;height:1.1rem;border-radius:50%;background:" + bandDotBackground + ";flex-shrink:0")} />
                  <span style={css("font-size:0.78rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{bandPrimary}</span>
                  <span style={css("width:1px;height:0.78rem;background:var(--border)")} />
                  <span style={css("font-size:0.7rem;color:var(--fg-muted);white-space:nowrap")}>{bandSecondary}</span>
                </div>
                <span style={css("display:inline-flex;align-items:center;gap:0.35rem;font-size:var(--text-2xs);color:var(--success);font-weight:500;flex-shrink:0")}><span style={css("width:0.38rem;height:0.38rem;border-radius:50%;background:var(--success)")} />Saved</span>
              </div>}
              {children}
            </div>
          </div>
          </div>

          {footer}
        </div>
      </section>
    </>
  );
}

export function GuidedUnsureToggle({ checked, onClick, accentColor = "var(--accent)" }: { checked: boolean; onClick: () => void; accentColor?: string }) {
  return (
    <label onClick={onClick} style={css("margin-top:0.55rem;display:inline-flex;align-items:center;gap:0.45rem;cursor:pointer;user-select:none")}>
      <span style={css("width:1rem;height:1rem;border-radius:0.28rem;display:grid;place-items:center;flex-shrink:0;" + (checked ? "background:" + accentColor + ";border:1.5px solid " + accentColor + ";color:#fff" : "border:1.5px solid var(--border)"))}>{checked && <Icon name="checkmark" size={8} />}</span>
      <span style={css("font-size:0.8rem;color:var(--fg-muted)")}>I&apos;m not sure about this yet</span>
    </label>
  );
}

export function GuidedOptionPill({ label, selected, onClick, accentColor, accentBackground }: { label: string; selected: boolean; onClick: () => void; accentColor: string; accentBackground: string }) {
  return (
    <div onClick={onClick} className="pt-gopt" style={css("display:flex;align-items:center;gap:0.45rem;min-height:2.3rem;padding:0.54rem 0.8rem;border-radius:999px;cursor:pointer;border:1px solid " + (selected ? accentColor : "var(--border)") + ";background:" + (selected ? accentBackground : "var(--surface)"))}>
      <span style={css("width:0.95rem;height:0.95rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;" + (selected ? "background:" + accentColor + ";color:#fff" : "border:1.5px solid var(--border)"))}>{selected && <Icon name="checkmark" size={8} />}</span>
      <span style={css("font-size:0.78rem;color:var(--fg);line-height:1.35")}>{label}</span>
    </div>
  );
}
