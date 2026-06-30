import { ChevronDown, Lock, LogOut, X, type LucideIcon } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type AccountMenuItem = { key: string; label: string; icon: LucideIcon; onClick: () => void; locked?: boolean };

export function AccountMenu({
  avatarLabel,
  name,
  subtitle,
  items,
  onLogout,
  showPrivacyLinks,
  collapsed,
  placement = "top",
  popoverEyebrow,
  popoverAvatarLabel,
  popoverName,
  popoverSubtitle,
}: {
  avatarLabel: string;
  name: string;
  subtitle: string;
  items: AccountMenuItem[];
  onLogout: () => void;
  showPrivacyLinks?: boolean;
  collapsed?: boolean;
  placement?: "top" | "bottom";
  popoverEyebrow?: string;
  popoverAvatarLabel?: string;
  popoverName?: string;
  popoverSubtitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocKind | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Popover renders with `position: fixed` (computed from the trigger's live
  // rect) instead of being absolutely positioned inside the sidebar — the
  // sidebar clips overflow-x, and the collapsed 64px rail is far too narrow
  // to host readable menu rows, so escaping via fixed coords is the only way
  // to give the popover real width in both expanded and collapsed states.
  const reposition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 12;
    const width = Math.max(r.width, 208);
    let left = r.left;
    if (left + width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - width - margin);
    const top = placement === "bottom" ? r.bottom + 8 : r.top - 8;
    setCoords({ top, left, width });
  }, [placement]);

  useEffect(() => {
    if (!open) return;
    reposition();
    const onScrollOrResize = () => reposition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  return (
    <div className="dashboard-account-menu" style={{ position: "relative" }}>
      {open && coords && createPortal(
        <div
          className="dashboard-account-popover"
          ref={panelRef}
          style={{ top: coords.top, left: coords.left, width: coords.width, transform: placement === "top" ? "translateY(-100%)" : undefined }}
        >
          <div className="dashboard-account-popover-client">
            <div className="dashboard-avatar">{popoverAvatarLabel ?? avatarLabel}</div>
            <div>
              {popoverEyebrow && <span className="dashboard-account-popover-eyebrow">{popoverEyebrow}</span>}
              <strong>{popoverName ?? name}</strong>
              <small>{popoverSubtitle ?? subtitle}</small>
            </div>
          </div>
          {items.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => { if (item.locked) return; setOpen(false); item.onClick(); }}
                style={item.locked ? { opacity: 0.4, cursor: "default" } : undefined}
                title={item.locked ? "Complete your Cocoon Consult to unlock" : undefined}
              >
                <Icon size={14} />
                <span>{item.label}</span>
                {item.locked && <Lock size={11} style={{ marginLeft: "auto", opacity: 0.6, flexShrink: 0 }} />}
              </button>
            );
          })}
          <div className="dashboard-account-popover-divider" />
          <button type="button" className="is-danger" onClick={() => { setOpen(false); onLogout(); }}>
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
          {showPrivacyLinks && (
            <>
              <div className="dashboard-account-popover-divider" />
              <div className="dashboard-account-popover-links">
                <a href="#" onClick={e => { e.preventDefault(); setOpen(false); setLegalDoc("privacy"); }}>Privacy Policy</a>
              </div>
            </>
          )}
        </div>,
        document.body
      )}
      <button type="button" ref={triggerRef} className="dashboard-profile dashboard-account-trigger" onClick={() => setOpen(v => !v)} aria-expanded={open}>
        <div className="dashboard-avatar">{avatarLabel}</div>
        <div>
          <strong>{name}</strong>
          <small>{subtitle}</small>
        </div>
        {!collapsed && <ChevronDown size={13} className="dashboard-account-chevron" />}
      </button>
      {legalDoc && createPortal(
        <LegalDocModal kind={legalDoc} onClose={() => setLegalDoc(null)} />,
        document.body
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// LEGAL DOCS — Privacy Policy / Terms of Service, shown as modals
// (triggered from the account popover's footer links; reuses the
// PhaseDetailModal overlay pattern — fixed backdrop + centered card,
// onClose callback, stopPropagation on the card so backdrop clicks close it)
// ─────────────────────────────────────────────

export type LegalDocKind = "privacy" | "terms";

export const LEGAL_DOCS: Record<LegalDocKind, { title: string; updated: string; intro: string; sections: { heading: string; body: string[] }[] }> = {
  privacy: {
    title: "Privacy Policy",
    updated: "June 2026",
    intro:
      "Short version: we collect the minimum we need to run your project and this portal, we never sell your data, and we'll tell you plainly if that ever changes.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account basics — your name, email, company, and login details for this client portal.",
          "Project content — the briefs, files, brand assets, feedback, and messages you share with us so we can actually do the work.",
          "Usage data — lightweight analytics on how the portal is used (pages viewed, features touched) so we can fix what's confusing and skip what isn't.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To deliver the project you hired us for — designing, building, reviewing, and shipping your site.",
          "To keep this portal running smoothly: notifications, status updates, file storage, and the review/approval flow you see in the Reviews tab.",
          "To improve our process. If three clients in a row trip over the same step, that's on us to fix — and your usage data is how we notice.",
        ],
      },
      {
        heading: "Cookies & analytics",
        body: [
          "We use essential cookies to keep you signed in and the portal functional — there's no getting around those.",
          "We use light, privacy-respecting analytics to understand portal usage in aggregate. We're not interested in tracking you across the web; we're interested in whether the Milestones tab makes sense.",
        ],
      },
      {
        heading: "Who we share it with",
        body: [
          "Nobody, by default. Your project details stay between you and Baltazar Studio.",
          "The exceptions are the tools that make the portal work — hosting, email delivery, and analytics providers — each bound by their own data agreements, and each only seeing what they need to do their narrow job.",
          "We don't sell data. We don't rent lists. If a future product or partnership would change that, we'll ask first, not apologize after.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "Active project data lives in the portal for as long as your project (and any post-launch support window) is active.",
          "After that, we keep a reasonable archive for legal, accounting, and 'can you remind me what we shipped in 2024' reasons — then it's cleared on a routine schedule.",
          "Want something deleted sooner? Ask. If we're not legally required to keep it, we'll remove it.",
        ],
      },
      {
        heading: "Your rights & choices",
        body: [
          "You can ask to see, correct, export, or delete the personal data we hold on you at any time — just reach out (see Contact below).",
          "You can opt out of non-essential analytics from your account settings.",
          "If you're in a region with specific data-protection laws (GDPR, CCPA, or similar), those rights apply to you in full — we're not going to make you cite statute numbers to get a straight answer.",
        ],
      },
      {
        heading: "Security",
        body: [
          "Your portal connection is encrypted in transit, access is authenticated, and project files are stored with the same care we'd want for our own studio's data.",
          "No system is bulletproof, but we treat your project content like the confidential work-in-progress it is — not like a marketing asset to be left lying around.",
        ],
      },
      {
        heading: "Changes to this policy",
        body: [
          "If this policy changes in any meaningful way, we'll let you know — through the portal, by email, or both — rather than quietly editing a page nobody rereads.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "Questions, requests, or just want to know exactly what we have on file? Email Trisha directly at hello@baltazarstudio.co — a real person reads and replies to that inbox.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "June 2026",
    intro:
      "Short version: you hired a studio to design and build your site, we'll do that work in good faith and on the timeline we agreed to, and this portal is the shared workspace where that happens.",
    sections: [
      {
        heading: "The client portal",
        body: [
          "This portal is where your project lives — briefs, milestones, files, reviews, and messages. Treat your login like you would your email password; you're responsible for activity under your account.",
          "We may update or improve the portal over time. We'll try not to move your cheese mid-project, but small UI changes shouldn't be read as a breach of anything.",
        ],
      },
      {
        heading: "Project scope & deliverables",
        body: [
          "The specifics — what's being built, the timeline, the price, the number of revision rounds — live in your project agreement/proposal, not in this document. This page covers the general rules of the road; that document covers the particulars of your project.",
          "If new requests come up mid-project that fall outside the agreed scope, we'll flag it and quote it separately rather than quietly absorbing it (or quietly resenting it).",
        ],
      },
      {
        heading: "Reviews & approvals",
        body: [
          "The Reviews tab is the official record of what you've approved. When you approve a gate, we treat that as sign-off to move forward — so take a real look before clicking through.",
          "Feedback turnarounds matter on both sides: the faster you review, the faster we ship. Long silences on your end can shift the timeline on ours.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "Invoices and payment terms are set out in your project agreement and shown in the Invoices area of this portal.",
          "Work may pause on overdue invoices — not as a punishment, but because a studio that doesn't get paid eventually stops being a studio.",
        ],
      },
      {
        heading: "Ownership & licensing",
        body: [
          "Once your project is paid in full, the final deliverables — the site, the designs made specifically for you — are yours to use as agreed in your proposal.",
          "Baltazar Studio retains the right to showcase the finished work in our portfolio, case studies, and marketing, because good work deserves to be seen (and so do we). If you'd rather we didn't, just say so before launch.",
          "Tools, templates, components, and internal frameworks we built before — or independently of — your project remain ours.",
        ],
      },
      {
        heading: "Confidentiality",
        body: [
          "Whatever you share with us to get the project done — business plans, credentials, unreleased branding — stays between us. We don't discuss client specifics outside the studio without your okay.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Use the portal for what it's for: running your project with us. Don't try to break it, scrape it, or use it to store or share anything illegal, infringing, or harmful.",
        ],
      },
      {
        heading: "Liability, in plain terms",
        body: [
          "We do careful, professional work — but we can't promise the portal or the final site will be perfect or uninterrupted every second of every day. To the extent the law allows, our liability for anything related to this engagement is limited to the amount you've paid us for the project.",
          "Neither of us is on the hook for indirect or consequential damages — lost profits, lost data from your own systems, that sort of thing — arising from this engagement.",
        ],
      },
      {
        heading: "Ending the engagement",
        body: [
          "Either side can end an active project per the notice terms in your agreement. You'll keep portal access to your existing files and history for a reasonable wind-down period afterward.",
          "Work completed and approved up to the point of termination is billable; work not yet started is not.",
        ],
      },
      {
        heading: "Changes to these terms",
        body: [
          "If we update these terms in a way that meaningfully affects you, we'll tell you directly rather than hoping you notice a quiet edit.",
        ],
      },
      {
        heading: "Contact",
        body: [
          "Questions about any of this? Email Trisha at hello@baltazarstudio.co. We'd rather clear something up in a two-minute reply than let it become a misunderstanding three weeks from now.",
        ],
      },
    ],
  },
};

export function LegalDocModal({ kind, onClose }: { kind: LegalDocKind; onClose: () => void }) {
  const doc = LEGAL_DOCS[kind];
  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.45)", zIndex: 1100 }}
        onClick={onClose}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "var(--surface)",
          borderRadius: "1rem",
          border: "1px solid var(--border)",
          width: "min(92vw, 560px)",
          maxHeight: "86vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          zIndex: 1101,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: "1rem", padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-soft)", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--fg)" }}>{doc.title}</div>
            <div style={{ fontSize: "var(--text-2xs)", color: "var(--fg-faint)", marginTop: "0.2rem" }}>Last updated {doc.updated} · Baltazar Studio</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", padding: "0.3rem", display: "flex", flexShrink: 0, borderRadius: "var(--radius)" }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "1.25rem 1.5rem 1.75rem", overflowY: "auto" }}>
          <p style={{ fontSize: "var(--text-base)", color: "var(--fg-muted)", lineHeight: 1.6, margin: "0 0 1.25rem", fontStyle: "italic" }}>
            {doc.intro}
          </p>
          {doc.sections.map(section => (
            <section key={section.heading} style={{ marginBottom: "1.1rem" }}>
              <h3 style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--fg)", margin: "0 0 0.4rem" }}>{section.heading}</h3>
              {section.body.map((para, i) => (
                <p key={i} style={{ fontSize: "var(--text-base)", color: "var(--fg-muted)", lineHeight: 1.6, margin: i === 0 ? 0 : "0.5rem 0 0" }}>
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
