"use client";

import { useState } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import { STUDIO_CLIENTS } from "../clients";
import type { PortalActions, PortalState } from "../store";
import { AuditReportView, getAuditReportDetail, getAuditReportSummary, recommendationPlan } from "./AuditReportView";

const CLIENT_ID = STUDIO_CLIENTS[0].id;
type AuditTheme = ReturnType<typeof getAuditReportDetail>["themes"][number];

function auditBandColor(band: string) {
  return { Strong: "var(--success)", Good: "var(--success)", "Needs work": "var(--warn)", Priority: "var(--danger)" }[band] || "var(--fg-muted)";
}

function AuditThemeCard({ theme }: { theme: AuditTheme }) {
  const color = auditBandColor(theme.band);
  const targetLeft = Math.min(100, Math.max(0, theme.target));
  const lift = theme.target - theme.score;
  const plan = recommendationPlan(theme);

  return (
    <article
      className="client-audit-theme-card"
      style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);padding:1.05rem;display:flex;flex-direction:column;gap:0.85rem;min-height:19.8rem")}
    >
      <div style={css("display:flex;align-items:center;gap:0.8rem")}>
        <span style={css("width:3.35rem;height:3.35rem;border-radius:50%;background:conic-gradient(" + color + " " + (theme.score * 3.6) + "deg, oklch(0.91 0.007 40) 0);display:grid;place-items:center;flex-shrink:0")}>
          <span style={css("width:2.58rem;height:2.58rem;border-radius:50%;background:var(--surface);display:grid;place-items:center;font-size:1rem;font-weight:500;color:var(--fg)")}>{theme.score}</span>
        </span>
        <div style={{ minWidth: 0 }}>
          <h3 style={css("margin:0;font-size:1.05rem;font-weight:500;letter-spacing:-0.01em;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{theme.name}</h3>
          <span style={css("display:inline-flex;align-items:center;margin-top:0.35rem;padding:0.16rem 0.58rem;border-radius:999px;background:color-mix(in srgb," + color + " 15%,white 85%);color:color-mix(in srgb," + color + " 58%,black 42%);font-size:0.68rem;font-weight:500;line-height:1")}>{theme.band}</span>
        </div>
      </div>

      <div>
        <div style={css("position:relative;height:0.42rem;border-radius:999px;background:oklch(0.93 0.008 40);overflow:visible")}>
          <div style={css("height:100%;width:" + theme.score + "%;border-radius:999px;background:" + color)} />
          <span style={css("position:absolute;left:" + targetLeft + "%;top:-0.18rem;width:2px;height:0.78rem;border-radius:999px;background:var(--fg);opacity:0.45;transform:translateX(-1px)")} />
        </div>
        <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-top:0.48rem;font-size:0.78rem;color:var(--fg-muted)")}>
          <span><strong style={{ fontWeight: 500, color: "var(--fg)" }}>{theme.score}</strong> <span style={{ color: "var(--fg-muted)" }}>↗ target {theme.target}</span></span>
          <strong style={{ fontWeight: 500, color: "var(--success)" }}>+{lift}</strong>
        </div>
      </div>

      <div style={css("height:1px;background:var(--border-soft)")} />

      <div style={css("display:flex;flex-direction:column;gap:0.48rem;flex:1")}>
        {theme.findings.map(finding => (
          <div key={finding} style={css("display:grid;grid-template-columns:auto minmax(0,1fr);gap:0.48rem;align-items:start;color:var(--fg-muted);font-size:0.83rem;line-height:1.35")}>
            <span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:" + color + ";margin-top:0.42rem")} />
            <span>{finding}</span>
          </div>
        ))}
      </div>

      <div style={css("display:flex;flex-direction:column;gap:0.42rem;padding:0.75rem 0.8rem;border-radius:var(--radius);background:var(--surface-alt);font-size:var(--text-base);line-height:1.35;color:var(--fg)")}>
        <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint)")}>Recommendation plan</div>
        {plan.map((item, index) => (
          <div key={item} style={css("display:grid;grid-template-columns:auto minmax(0,1fr);gap:0.52rem;align-items:start")}>
            <span style={css("width:1.08rem;height:1.08rem;border-radius:0.36rem;background:color-mix(in srgb," + color + " 15%,white 85%);color:" + color + ";display:grid;place-items:center;font-size:0.54rem;font-weight:500;margin-top:0.06rem")}>{index + 1}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function AuditUpsellScreen({
  clientName,
  current,
  target,
  lift,
  priorityCount,
  mobile,
  onOpenPlan,
  onOpenFunnels,
}: {
  clientName: string;
  current: number;
  target: number;
  lift: number;
  priorityCount: number;
  mobile: boolean;
  onOpenPlan: () => void;
  onOpenFunnels: () => void;
}) {
  const steps = [
    { icon: "checkmark", label: "Audit reviewed", detail: current + " current score", tone: "var(--success)" },
    { icon: "feather", label: "Winged in a Week", detail: priorityCount + " priority fixes", tone: "var(--accent)" },
    { icon: "life", label: "In Full Flight", detail: "Optional care after launch", tone: "var(--cocoon)" },
  ];
  const scoreCards = [
    ["Current", String(current), "var(--fg)"],
    ["Target", String(target), "var(--success)"],
    ["Lift", "+" + lift, "var(--accent)"],
  ] as const;

  return (
    <section style={css("position:relative;overflow:hidden;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 7%,white 93%),var(--surface) 48%,color-mix(in srgb,var(--success) 7%,white 93%));padding:" + (mobile ? "1rem" : "1.15rem 1.2rem"))}>
      <div style={css("display:grid;grid-template-columns:" + (mobile ? "minmax(0,1fr)" : "minmax(0,1.1fr) minmax(18rem,0.9fr)") + ";gap:var(--space-4);align-items:stretch")}>
        <div style={css("display:flex;flex-direction:column;justify-content:space-between;gap:var(--space-4);min-width:0")}>
          <div>
            <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;display:flex;align-items:center;gap:0.45rem;color:var(--cocoon)")}>
              <span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--cocoon)")} />
              Recommended next step
            </div>
            <h3 style={css("margin:0.42rem 0 0;font-size:" + (mobile ? "1.25rem" : "1.55rem") + ";font-weight:500;letter-spacing:-0.025em;line-height:1.08;color:var(--fg)")}>Ready to turn the audit into action?</h3>
            <p style={css("margin:0.45rem 0 0;max-width:42rem;font-size:0.86rem;line-height:1.55;color:var(--fg-muted)")}>
              {clientName}&apos;s report is ready to become a focused sprint plan.
            </p>
            <div style={css("display:flex;align-items:center;gap:0.55rem;flex-wrap:wrap;margin-top:0.85rem")}>
              <button type="button" onClick={onOpenPlan} className="pt-op" style={css("display:inline-flex;align-items:center;justify-content:center;gap:0.42rem;min-height:2.35rem;padding:0 1rem;border:none;border-radius:999px;background:var(--fg);color:#fff;font-size:0.78rem;font-weight:500;cursor:pointer")}>
                View sprint proposal <Icon name="arrow" size={13} />
              </button>
              <button type="button" onClick={onOpenFunnels} style={css("display:inline-flex;align-items:center;justify-content:center;gap:0.42rem;min-height:2.35rem;padding:0 0.95rem;border:1px solid var(--border);border-radius:999px;background:rgba(255,255,255,.68);color:var(--fg);font-size:0.78rem;font-weight:500;cursor:pointer")}>
                Open funnel direction <Icon name="funnel" size={13} />
              </button>
            </div>
            <div style={css("display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:0.45rem;max-width:" + (mobile ? "100%" : "22rem") + ";margin-top:0.9rem")}>
              {scoreCards.map(([label, value, color]) => (
                <div key={label} style={css("border:1px solid var(--border-soft);border-radius:0.8rem;background:rgba(255,255,255,.72);padding:0.65rem 0.55rem;text-align:center")}>
                  <div style={css("font-size:1.15rem;font-weight:500;line-height:1;color:" + color)}>{value}</div>
                  <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);margin-top:0.28rem")}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={css("display:flex;flex-direction:column;gap:0.65rem")}>
          <div style={css("display:flex;flex-direction:column;gap:0.45rem")}>
            {steps.map(step => (
              <div key={step.label} style={css("display:grid;grid-template-columns:auto minmax(0,1fr);gap:0.65rem;align-items:center;border:1px solid var(--border-soft);border-radius:0.9rem;background:rgba(255,255,255,.68);padding:0.66rem 0.75rem")}>
                <span style={css("width:1.9rem;height:1.9rem;border-radius:0.62rem;background:color-mix(in srgb," + step.tone + " 14%,white 86%);color:" + step.tone + ";display:grid;place-items:center")}>
                  <Icon name={step.icon} size={13} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={css("display:block;font-size:var(--text-base);font-weight:500;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{step.label}</span>
                  <span style={css("display:block;margin-top:0.06rem;font-size:0.7rem;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{step.detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ClientAudits({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [reportOpen, setReportOpen] = useState(false);
  const client = STUDIO_CLIENTS.find(item => item.id === CLIENT_ID) || STUDIO_CLIENTS[0];
  if (!client.audited) {
    return <div style={css("padding:2.5rem 1rem;text-align:center;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);color:var(--fg-faint);font-size:0.8rem")}>No completed audit yet.</div>;
  }
  const report = getAuditReportDetail(client.id);
  const summary = getAuditReportSummary(client.id);
  const lift = summary.target - summary.overall;
  const themes = [...report.themes].sort((a, b) => a.score - b.score);
  const stats = [
    { label: "Audit score", value: String(summary.overall), sub: "current baseline", valColor: "var(--fg)" },
    { label: "Projected lift", value: "+" + lift, sub: "after priority fixes", valColor: "var(--success)" },
    { label: "Target", value: String(summary.target), sub: "recommended outcome", valColor: "var(--cocoon)" },
    { label: "Last tested", value: client.audit.due, sub: client.audit.statusLabel, valColor: "var(--fg)" },
  ];

  return (
    <>
      <div style={css("display:flex;flex-direction:column;gap:1.1rem")}>
        <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;padding:1rem 1.1rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface)")}>
          <div style={{ minWidth: 0 }}>
            <span style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;display:block;color:var(--cocoon);margin-bottom:0.45rem")}>Cocoon Consult plan</span>
            <h2 style={css("margin:0;font-size:1.22rem;font-weight:500;line-height:1.15")}>Your audit plan is ready</h2>
            <p style={css("margin:0.45rem 0 0;font-size:var(--text-base);color:var(--fg-muted);line-height:1.55;max-width:36rem")}>Review the current score, target lift, and the recommended fixes from your latest Cocoon Consult audit.</p>
          </div>
          <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap;flex-shrink:0")}>
            <span style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.45rem 0.75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:0.73rem;color:var(--fg-muted)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--cocoon)")} />{summary.overall} current</span>
            <span style={css("display:inline-flex;align-items:center;gap:0.35rem;padding:0.45rem 0.75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface-alt);font-size:0.73rem;color:var(--fg-muted)")}><span style={css("width:0.42rem;height:0.42rem;border-radius:50%;background:var(--success)")} />{summary.target} target</span>
            <button onClick={() => setReportOpen(true)} className="pt-op" style={css("display:inline-flex;align-items:center;gap:0.42rem;min-height:2.3rem;padding:0 0.95rem;border:none;border-radius:999px;background:var(--accent);color:#fff;font-size:0.78rem;font-weight:500;cursor:pointer")}><Icon name="chart" size={15} />View Plan</button>
          </div>
        </div>

        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr));gap:0.6rem")}>
          {stats.map(s => (
            <div key={s.label} style={css("padding:0.9rem 1rem;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface)")}>
              <div style={css("font-size:var(--text-2xs);font-weight:500;letter-spacing:0.02em;color:var(--fg-faint)")}>{s.label}</div>
              <div style={css("display:flex;align-items:baseline;gap:0.45rem;flex-wrap:wrap;margin-top:0.25rem")}>
                <div style={css("font-size:var(--text-3xl);font-weight:500;line-height:1.1;color:" + s.valColor)}>{s.value}</div>
                <div style={css("font-size:var(--text-xs);color:var(--fg-muted)")}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <AuditUpsellScreen
          clientName={client.name}
          current={summary.overall}
          target={summary.target}
          lift={lift}
          priorityCount={themes.filter(theme => theme.band === "Priority" || theme.band === "Needs work").length}
          mobile={state.isMobile}
          onOpenPlan={() => setReportOpen(true)}
          onOpenFunnels={() => actions.setView("funnels")}
        />

        <section style={css("display:grid;grid-template-columns:" + (state.isMobile ? "minmax(0,1fr)" : "repeat(3,minmax(0,1fr))") + ";gap:var(--space-3);align-items:stretch")}>
          {themes.map(theme => <AuditThemeCard key={theme.name} theme={theme} />)}
        </section>
      </div>

      {reportOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Audit plan preview"
          onClick={() => setReportOpen(false)}
          style={css("position:fixed;inset:0;z-index:80;background:rgba(48,34,31,0.38);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:" + (state.isMobile ? "0.7rem" : "1.2rem"))}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={css("position:relative;width:min(100%,76rem);max-height:calc(100vh - " + (state.isMobile ? "1.4rem" : "2.4rem") + ");overflow:auto;border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:var(--surface);box-shadow:0 1.4rem 4rem rgba(48,34,31,0.18)")}
          >
            <button
              type="button"
              aria-label="Close audit plan"
              onClick={() => setReportOpen(false)}
              className="pt-iconbtn"
              style={css("position:sticky;top:0;float:right;z-index:2;margin:0.85rem 0.85rem 0 0;width:2rem;height:2rem;border-radius:50%;border:1px solid var(--border-soft);background:var(--surface);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer")}
            >
              ×
            </button>
            <AuditReportView
              state={state}
              actions={actions}
              clientId={client.id}
              clientName={client.name}
              reportRunLabel="Latest report"
              reportRunDate={client.audit.due}
              initialLayout="priority"
              showInlineProposal
              onBack={() => setReportOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
