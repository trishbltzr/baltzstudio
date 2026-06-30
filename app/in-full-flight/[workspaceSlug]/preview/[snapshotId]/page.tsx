import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import {
  getPrototypePreviewPath,
  getPrototypeSnapshot,
  getPrototypeWorkspace,
} from "@/lib/inFullFlightPrototype";

export default async function InFullFlightPreviewPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; snapshotId: string }>;
}) {
  const { workspaceSlug, snapshotId } = await params;
  const workspace = getPrototypeWorkspace(workspaceSlug);
  const snapshot = getPrototypeSnapshot(snapshotId);

  return (
    <div className="iff-preview-page">
      <div className="iff-preview-shell">
        <header className="iff-preview-topbar">
          <div>
            <p className="iff-kicker">Staged preview</p>
            <h1>{snapshot.label}</h1>
            <p className="iff-topbar-copy">
              Draft website edit for {workspace.clientName}. This page represents the review artifact the client sees after asking for a change in chat.
            </p>
          </div>
          <div className="iff-topbar-pills">
            <span className="iff-pill is-warm">
              <Eye size={14} />
              {snapshot.stageLabel}
            </span>
            <Link className="iff-pill iff-pill-link" href={`/in-full-flight/${workspace.slug}`}>
              <ArrowLeft size={14} />
              Back to chat
            </Link>
          </div>
        </header>

        <div className="iff-preview-browser">
          <div className="iff-preview-browser-bar">
            <span />
            <span />
            <span />
            <code>{getPrototypePreviewPath(workspace.slug, snapshot.id)}</code>
          </div>

          <div className="iff-site-surface">
            <div className="iff-site-announcement">{snapshot.announcement}</div>

            <section className="iff-site-hero">
              <div className="iff-site-copy">
                <p className="iff-site-eyebrow">{snapshot.eyebrow}</p>
                <h2>{snapshot.headline}</h2>
                <p>{snapshot.body}</p>
                <div className="iff-site-cta-row">
                  <button type="button">{snapshot.primaryCta}</button>
                  <button type="button" className="is-secondary">
                    {snapshot.secondaryCta}
                  </button>
                </div>
              </div>
              <div className="iff-site-visual" aria-hidden="true">
                <div className="iff-site-photo-card" />
                <div className="iff-site-floating-note">Preview generated from chat request</div>
              </div>
            </section>

            <section className="iff-site-proof-strip">
              {snapshot.proofItems.map(item => (
                <article key={item}>
                  <strong>{item}</strong>
                </article>
              ))}
            </section>

            {snapshot.testimonials ? (
              <section className="iff-site-testimonials">
                <div>
                  <p className="iff-site-section-kicker">Inserted section</p>
                  <h3>What clients say after launch</h3>
                </div>
                <div className="iff-site-testimonial-grid">
                  {snapshot.testimonials.map(testimonial => (
                    <article key={testimonial.name}>
                      <p>"{testimonial.quote}"</p>
                      <strong>{testimonial.name}</strong>
                      <span>{testimonial.role}</span>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="iff-site-footer-cta">
              <div>
                <p className="iff-site-section-kicker">Change summary</p>
                <h3>{snapshot.changeSummary}</h3>
              </div>
              <p>
                This prototype preview route is intentionally separate from the internal dashboard so the client sees only the staged outcome, not the studio operations behind it.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
