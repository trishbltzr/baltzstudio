"use client";

import { Clock3, Orbit } from "lucide-react";
import type { InFullFlightWorkspace } from "@/lib/inFullFlightPrototype";
import { InFullFlightAssistantWidget } from "@/components/InFullFlightAssistantWidget";

export function InFullFlightPrototype({ workspace }: { workspace: InFullFlightWorkspace }) {
  return (
    <div className="iff-app-shell iff-app-shell--canvas">
      <div className="iff-product-stage">
        <div className="iff-faux-app">
          <header className="iff-faux-topbar">
            <div className="iff-faux-search">Search workspace</div>
            <div className="iff-faux-actions">
              <span className="iff-pill is-warm">
                <Orbit size={14} />
                Separate app prototype
              </span>
              <span className="iff-pill">
                <Clock3 size={14} />
                {workspace.supportTier}
              </span>
            </div>
          </header>

          <section className="iff-faux-toolbar">
            <span>{workspace.clientName}</span>
            <span>{workspace.siteName}</span>
            <span>{workspace.liveUrl}</span>
            <span>Assistant preview</span>
          </section>

          <section className="iff-faux-dashboard">
            <article className="iff-surface-card iff-surface-card--hero">
              <p className="iff-section-label">In Full Flight</p>
              <h1>AI chatbot for post-launch website edits</h1>
              <p>
                The long-term goal is to make this an assistant inside the dashboard. For now, this separate app surface lets us test the conversational behavior first.
              </p>
            </article>

            <article className="iff-surface-card iff-surface-card--metric">
              <span>Auto-preview</span>
              <strong>Enabled for low-risk edits</strong>
            </article>
            <article className="iff-surface-card iff-surface-card--metric">
              <span>Policy</span>
              <strong>Push back on redesign requests</strong>
            </article>
            <article className="iff-surface-card iff-surface-card--chart">
              <span className="iff-section-label">Support activity</span>
              <div className="iff-chart-lines" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
            </article>
            <article className="iff-surface-card iff-surface-card--list">
              <span className="iff-section-label">Workspace signals</span>
              <ul className="iff-fact-list">
                <li>
                  <span>Client</span>
                  <strong>{workspace.clientName}</strong>
                </li>
                <li>
                  <span>Queue health</span>
                  <strong>Preview the assistant in context</strong>
                </li>
                <li>
                  <span>Scope rule</span>
                  <strong>{workspace.pushbackRules[0]}</strong>
                </li>
              </ul>
            </article>
          </section>

          <InFullFlightAssistantWidget workspace={workspace} shellClassName="iff-widget-anchor" defaultOpen />
        </div>
      </div>
    </div>
  );
}
