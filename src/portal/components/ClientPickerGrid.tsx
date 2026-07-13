"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "../icons";
import { css, initials } from "../helpers";
import { TONE, type Tone } from "../clients";

// One card in the client-discovery grid. Callers map their data (audit facet,
// funnel facet, …) onto this shape and wire the two footer actions.
export interface ClientCardData {
  id: string;
  name: string;
  subtitle: string;
  statusLabel: string;
  statusTone: Tone;
  stage: string;
  progress: number;
  owner: string;
  due: string;
  headerAction?: {
    label: string;
    shortLabel?: string;
    icon?: string;
    onClick: () => void;
  };
  hero?: ReactNode;
  showStatus?: boolean;
  showProgress?: boolean;
  showStage?: boolean;
  showMeta?: boolean;
  showFooter?: boolean;
  stats?: Array<{
    label: string;
    value: string;
    tone?: "default" | "accent" | "success" | "warn" | "danger";
  }>;
  statsLayout?: "grid" | "vertical";
  compactDetails?: boolean;
  details?: Array<{
    id: string;
    title: string;
    statusLabel: string;
    statusTone: Tone;
    stage: string;
    assignee: string;
    due: string;
    onOpen?: () => void;
    actions?: Array<{ label: string; onClick: () => void }>;
  }>;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  secondaryIcon?: string;
  onSecondary: () => void;
}

// Full client-discovery grid: filter toolbar + count + responsive card grid.
// Renders as a plain block so it drops into the padded shell (Audit) or a
// full-bleed wrapper (funnel builder) alike.
export function ClientPickerGrid({ cards, countLabel = "client", compact = false }: { cards: ClientCardData[]; countLabel?: string; compact?: boolean }) {
  return (
    <div style={css("display:flex;flex-direction:column;gap:" + (compact ? "0.75rem" : "1.1rem"))}>
      <div style={css("display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap")}>
        <span style={css("display:inline-flex;align-items:center;gap:0.45rem;padding:" + (compact ? "0.42rem 0.78rem" : "0.5rem 0.9rem") + ";border:1px solid var(--border);border-radius:var(--radius-pill);background:var(--surface);font-size:" + (compact ? "0.76rem" : "0.82rem") + ";font-weight:500;color:var(--fg)")}>
          <span style={css("color:var(--fg-muted);font-weight:400")}>Service ·</span> All Services <Icon name="chev" size={14} />
        </span>
        <span style={css("margin-left:auto;font-size:0.78rem;color:var(--fg-faint)")}>{cards.length} {countLabel}{cards.length === 1 ? "" : "s"}</span>
      </div>
      <div style={css("display:grid;grid-template-columns:repeat(auto-fill,minmax(" + (compact ? "18.5rem" : "19rem") + ",1fr));gap:" + (compact ? "0.85rem" : "1rem") + ";align-items:" + (compact ? "stretch" : "start"))}>
        {cards.map(c => <ClientCard key={c.id} c={c} compact={compact} />)}
      </div>
    </div>
  );
}

function ClientCard({ c, compact }: { c: ClientCardData; compact: boolean }) {
  const t = TONE[c.statusTone];
  const [activeDetailId, setActiveDetailId] = useState<string | null>(null);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const showStatus = c.showStatus ?? true;
  const showProgress = c.showProgress ?? true;
  const showStage = c.showStage ?? true;
  const showMeta = c.showMeta ?? true;
  const showFooter = c.showFooter ?? true;
  const stats = c.stats || [];
  const canExpandStats = c.statsLayout === "vertical" && stats.length > 2;
  const visibleStats = canExpandStats && !statsExpanded ? stats.slice(0, 2) : stats;
  const cardTone = c.statusTone === "success" ? "var(--success)" : c.statusTone === "warn" ? "var(--warn)" : c.statusTone === "danger" ? "var(--danger)" : "var(--accent)";
  return (
    <div className="pt-card client-card" style={css("border:1px solid color-mix(in srgb,var(--border-soft) 82%," + cardTone + " 18%);border-radius:" + (compact ? "1.02rem" : "var(--radius-panel)") + ";background:" + (compact ? "linear-gradient(180deg,color-mix(in srgb," + cardTone + " 5%,white 95%) 0%,var(--surface) 30%,var(--surface) 100%)" : "linear-gradient(180deg,color-mix(in srgb," + cardTone + " 4%,var(--surface) 96%) 0%,var(--surface) 32%)") + ";overflow:hidden;display:flex;flex-direction:column;height:" + (compact ? "100%" : "auto") + ";min-height:" + (compact ? "13.7rem" : "0"))}>
      <div aria-hidden="true" style={css("height:0.24rem;background:linear-gradient(90deg," + cardTone + " 0%,color-mix(in srgb," + cardTone + " 72%,var(--surface) 28%) 72%,color-mix(in srgb," + cardTone + " 20%,var(--surface) 80%) 100%);flex-shrink:0")} />
      <div style={css("padding:" + (compact ? "0.86rem 0.88rem 0.94rem" : "1rem 1.1rem"))}>
        <div style={css("display:flex;align-items:center;gap:" + (compact ? "0.62rem" : "0.65rem") + ";margin-bottom:" + (compact ? "0.6rem" : "0.85rem"))}>
          <span style={css("width:" + (compact ? "1.9rem" : "1.95rem") + ";height:" + (compact ? "1.9rem" : "1.95rem") + ";border-radius:" + (compact ? "0.66rem" : "var(--radius-sm)") + ";background:color-mix(in srgb," + cardTone + " 13%,var(--surface-alt) 87%);color:" + cardTone + ";display:grid;place-items:center;font-weight:500;font-size:" + (compact ? "0.78rem" : "0.8rem") + ";flex-shrink:0")}>{c.name[0]}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={css("font-weight:500;font-size:" + (compact ? "0.86rem" : "0.88rem") + ";overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{c.name}</div>
            {c.subtitle && <div style={css("font-size:" + (compact ? "0.67rem" : "0.74rem") + ";color:var(--fg-muted);margin-top:0.1rem")}>{c.subtitle}</div>}
          </div>
          {showStatus && <span style={css("display:inline-flex;align-items:center;gap:0.32rem;font-size:var(--text-2xs);font-weight:500;padding:0.18rem 0.52rem;border-radius:999px;white-space:nowrap;background:" + t.soft + ";color:" + t.color)}>
            <span style={css("width:0.38rem;height:0.38rem;border-radius:50%;background:" + t.color + ";flex-shrink:0")} />
            {c.statusLabel}
          </span>}
          {c.headerAction && (
            <button
              type="button"
              onClick={c.headerAction.onClick}
              title={c.headerAction.label}
              aria-label={c.headerAction.label}
              className="pt-softbtn"
              style={css((c.headerAction.icon && !c.headerAction.shortLabel ? "width:" + (compact ? "1.72rem" : "1.62rem") + ";padding:0;display:grid;place-items:center;background:color-mix(in srgb," + cardTone + " 13%,white 87%)" : "width:auto;padding:0 0.62rem;display:inline-flex;align-items:center;justify-content:center;gap:0.3rem;background:color-mix(in srgb," + cardTone + " 8%,var(--surface) 92%)") + ";height:" + (compact ? "1.72rem" : "1.62rem") + ";border:1px solid color-mix(in srgb," + cardTone + " 18%,var(--border-soft) 82%);border-radius:999px;color:" + cardTone + ";cursor:pointer;flex-shrink:0;font-size:0.64rem;font-weight:500;white-space:nowrap")}
            >
              {c.headerAction.icon && <Icon name={c.headerAction.icon} size={13} />}
              {(!c.headerAction.icon || c.headerAction.shortLabel) && <span>{c.headerAction.shortLabel || c.headerAction.label}</span>}
            </button>
          )}
        </div>
        {c.hero ? (
          <div style={css("margin-bottom:" + (compact ? "0.58rem" : "0.85rem"))}>{c.hero}</div>
        ) : showProgress ? (
          <div style={css("display:flex;align-items:center;gap:0.6rem;margin-bottom:0.85rem")}>
            <span style={css("display:inline-flex;align-items:center;font-size:var(--text-2xs);font-weight:500;padding:0.16rem 0.5rem;border-radius:999px;white-space:nowrap;background:var(--accent-soft);color:var(--accent)")}>{c.stage}</span>
            <div style={css("flex:1;height:0.35rem;border-radius:999px;background:oklch(0.94 0.006 50);overflow:hidden")}><div style={css("width:" + c.progress + "%;height:100%;background:var(--accent)")} /></div>
            <span style={css("font-size:0.7rem;color:var(--fg-muted)")}>{c.progress}%</span>
          </div>
        ) : showStage ? (
          <div style={css("display:flex;align-items:center;gap:0.6rem;margin-bottom:0.85rem")}>
            <span style={css("display:inline-flex;align-items:center;font-size:var(--text-2xs);font-weight:500;padding:0.16rem 0.5rem;border-radius:999px;white-space:nowrap;background:var(--accent-soft);color:var(--accent)")}>{c.stage}</span>
          </div>
        ) : (
          <div style={{ height: compact ? 0 : "0.1rem" }} />
        )}
        {visibleStats && visibleStats.length > 0 && (
          <div style={css((c.statsLayout === "vertical"
            ? "display:flex;flex-direction:column"
            : "display:grid;grid-template-columns:repeat(" + Math.min(stats.length, 3) + ",minmax(0,1fr))") + ";gap:0.45rem;margin:" + (showProgress || showStage ? "-0.25rem 0 0.85rem" : (compact ? "0.45rem 0 0.72rem" : "0.55rem 0 0.85rem")))}>
            {visibleStats.map(stat => {
              const tone = stat.tone || "default";
              const color = tone === "success"
                ? "var(--success)"
                : tone === "warn"
                  ? "var(--warn)"
                  : tone === "danger"
                    ? "var(--danger)"
                    : tone === "accent"
                      ? "var(--accent)"
                    : "var(--fg)";
              const resultMatch = c.statsLayout === "vertical" ? stat.value.match(/^(\d+)\s(↗)\s(\d+)$/) : null;
              return (
                <div key={stat.label} style={css("min-width:0;padding:" + (compact && c.statsLayout !== "vertical" ? "0.64rem 0.5rem" : c.statsLayout === "vertical" ? "0.5rem 0.68rem" : "0.48rem 0.52rem") + ";border:1px solid color-mix(in srgb,var(--border-soft) 86%,white 14%);border-radius:" + (c.statsLayout === "vertical" ? "999px" : compact ? "0.68rem" : "0.7rem") + ";background:color-mix(in srgb,var(--surface-alt) 64%,var(--surface) 36%);" + (c.statsLayout === "vertical" ? "display:flex;align-items:center;justify-content:space-between;gap:0.8rem" : compact ? "text-align:center" : ""))}>
                  {compact && c.statsLayout !== "vertical" ? (
                    <>
                      <div style={css("font-size:1.05rem;line-height:1;font-weight:500;color:" + color + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{stat.value}</div>
                      <div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:0.35rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{stat.label}</div>
                    </>
                  ) : (
                    <>
                      <div style={css("display:flex;align-items:center;gap:0.45rem;min-width:0")}>
                        <span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:" + color + ";flex-shrink:0;opacity:0.85")} />
                        <div style={css((c.statsLayout === "vertical" ? "font-size:var(--text-xs);letter-spacing:0;color:var(--fg);text-transform:none;font-weight:500" : "text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)") + ";white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{stat.label}</div>
                      </div>
                      <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:0.42rem;min-width:0;margin-top:" + (c.statsLayout === "vertical" ? "0" : "0.2rem") + ";font-size:0.78rem;line-height:1.15;color:" + color + ";font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:right")}>
                        {resultMatch ? (
                          <span style={css("display:inline-flex;align-items:center;gap:0.22rem;overflow:hidden;text-overflow:ellipsis")}>
                            <span style={css("color:" + color)}>{resultMatch[1]}</span>
                            <span style={css("color:var(--success)")}>{resultMatch[2]}</span>
                            <span style={css("color:var(--success)")}>{resultMatch[3]}</span>
                          </span>
                        ) : <span style={css("overflow:hidden;text-overflow:ellipsis")}>{stat.value}</span>}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
            {canExpandStats && (
              <button
                type="button"
                onClick={() => setStatsExpanded(v => !v)}
                className="pt-softbtn"
                style={css("display:inline-flex;align-items:center;justify-content:center;gap:0.35rem;width:100%;min-height:1.85rem;border:1px dashed var(--border);border-radius:999px;background:transparent;color:var(--fg-muted);font-size:0.68rem;font-weight:500;cursor:pointer")}
              >
                {statsExpanded ? "Show less" : "Show all " + stats.length}
                <span style={css("display:inline-flex;transition:transform .16s;transform:rotate(" + (statsExpanded ? "180deg" : "0deg") + ")")}><Icon name="chev" size={12} /></span>
              </button>
            )}
          </div>
        )}
        {c.details && (
          <div style={css(c.compactDetails ? "display:flex;flex-direction:column;gap:0.38rem;margin:0.18rem 0 0;max-height:5.75rem;overflow-y:auto;padding-right:0.12rem" : "display:flex;flex-direction:column;gap:0.42rem;margin:-0.2rem 0 0.85rem")}>
            {c.details.map(row => {
              const rowTone = TONE[row.statusTone];
              if (c.compactDetails) {
                const hasActions = !!row.actions?.length;
                const active = hasActions && activeDetailId === row.id;
                return (
                  <div key={row.id} style={css("border:" + (active ? "1.5px" : "1px") + " solid " + (active ? "color-mix(in srgb,var(--accent) 42%,var(--border-soft) 58%)" : "color-mix(in srgb,var(--border-soft) 88%,white 12%)") + ";border-radius:" + (active ? "0.9rem" : "999px") + ";background:" + (active ? "color-mix(in srgb,var(--accent-soft) 34%,var(--surface) 66%)" : "color-mix(in srgb,var(--surface-alt) 58%,var(--surface) 42%)") + ";overflow:hidden;transition:border-color .16s ease,border-radius .16s ease,background .16s ease")}>
                    <button
                      type="button"
                      data-detail-id={row.id}
                      onClick={() => {
                        if (hasActions) setActiveDetailId(active ? null : row.id);
                        else row.onOpen?.();
                      }}
                      className="pt-softbtn"
                      style={css("display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:0.56rem;align-items:center;width:100%;min-height:2.42rem;padding:0.42rem 0.5rem 0.42rem 0.62rem;border:none;background:transparent;color:var(--fg);text-align:left;cursor:pointer")}
                    >
                      <span style={css("width:0.46rem;height:0.46rem;border-radius:50%;background:" + rowTone.color + ";flex-shrink:0")} />
                      <span style={css("display:flex;align-items:baseline;gap:0.38rem;min-width:0")}>
                        <span style={css("font-size:0.78rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{row.title}</span>
                      </span>
							<span style={css("display:flex;align-items:center;justify-content:flex-end;gap:0.42rem;min-width:0")}>
								<span style={css("display:inline-flex;align-items:center;font-size:var(--text-2xs);font-weight:500;padding:0.22rem 0.5rem;border-radius:999px;white-space:nowrap;background:" + rowTone.soft + ";color:" + rowTone.color)}>{row.statusLabel}</span>
								<span style={css("display:inline-flex;align-items:center;gap:0.22rem;font-size:0.64rem;color:var(--fg-faint);white-space:nowrap")}><Icon name="cal" size={10} />{row.due}</span>
							</span>
                    </button>
                    {active && row.actions && (
                      <div style={css("display:flex;gap:0.45rem;padding:0 0.62rem 0.62rem")}>
                        {row.actions.map(action => (
                          <button
                            key={action.label}
                            type="button"
                            onClick={action.onClick}
                            className="pt-softbtn"
                            style={css("height:1.85rem;padding:0 0.65rem;border:1px solid var(--border-soft);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:0.68rem;font-weight:500;cursor:pointer")}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={row.id} style={css("display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0.7rem;align-items:center;padding:0.58rem 0.62rem;border:1px solid var(--border-soft);border-radius:0.85rem;background:var(--surface-alt)")}>
                  <div style={{ minWidth: 0 }}>
                    <div style={css("display:flex;align-items:center;gap:0.45rem;min-width:0")}>
                      <span style={css("font-size:0.78rem;font-weight:500;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{row.title}</span>
                      <span style={css("display:inline-flex;align-items:center;font-size:0.6rem;font-weight:500;padding:0.12rem 0.42rem;border-radius:999px;white-space:nowrap;background:" + rowTone.soft + ";color:" + rowTone.color)}>{row.statusLabel}</span>
                    </div>
                    <div style={css("display:flex;align-items:center;gap:0.55rem;flex-wrap:wrap;margin-top:0.28rem;font-size:0.68rem;color:var(--fg-muted)")}>
                      <span>{row.stage}</span>
                      <span style={css("display:inline-flex;align-items:center;gap:0.28rem")}><span style={css("width:1.25rem;height:1.25rem;border-radius:50%;background:oklch(0.95 0.004 50);color:var(--fg-muted);font-size:0.52rem;font-weight:500;display:grid;place-items:center")}>{initials(row.assignee)}</span>{row.assignee}</span>
                      <span style={css("display:inline-flex;align-items:center;gap:0.28rem")}><Icon name="cal" size={11} />{row.due}</span>
                    </div>
                  </div>
                  {row.onOpen && (
                    <button type="button" onClick={row.onOpen} className="pt-softbtn" style={css("height:1.8rem;padding:0 0.58rem;border:1px solid var(--border-soft);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>Open</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {showMeta && <div style={css("display:flex;align-items:center;gap:var(--space-2);font-size:0.74rem;color:var(--fg-muted);margin-top:" + (c.details && c.compactDetails ? "0.72rem" : "0"))}>
          <span style={css("width:1.5rem;height:1.5rem;border-radius:50%;background:oklch(0.95 0.004 50);color:var(--fg-muted);font-size:0.6rem;font-weight:500;display:grid;place-items:center")}>{initials(c.owner)}</span>{c.owner}
          <span style={css("margin-left:auto;display:inline-flex;align-items:center;gap:0.3rem")}><Icon name="cal" size={12} />{c.due}</span>
        </div>}
      </div>
      {showFooter && <div style={css("margin-top:auto;border-top:1px solid var(--border-soft);display:flex;background:color-mix(in srgb,var(--surface-alt) 45%,var(--surface) 55%)")}>
        <button type="button" onClick={c.onPrimary} className="pt-softbtn" style={css("flex:1;padding:0.62rem;border:none;border-right:1px solid var(--border-soft);background:transparent;color:var(--fg);font-size:0.74rem;font-weight:500;cursor:pointer")}>{c.primaryLabel}</button>
        <button type="button" onClick={c.onSecondary} className="pt-softbtn" style={css("flex:1;padding:0.62rem;border:none;background:transparent;color:var(--fg-muted);font-size:0.74rem;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem")}>{c.secondaryIcon && <Icon name={c.secondaryIcon} size={15} />}{c.secondaryLabel}</button>
      </div>}
    </div>
  );
}
