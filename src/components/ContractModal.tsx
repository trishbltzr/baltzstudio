import { Check, ChevronDown, FileSignature, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Project } from "../types";

function ContractSection({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="contract-section">
      <button type="button" className={`contract-section-toggle ${open ? "is-open" : ""}`} onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
      </button>
      {open && <div className="contract-section-body">{children}</div>}
    </div>
  );
}

export function ContractModal({ project, onClose }: { project: Project; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", zIndex: 1000 }} />
      <div onClick={e => e.stopPropagation()} className="contract-modal">
        <div className="contract-modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileSignature size={15} style={{ color: "var(--fg-muted)" }} />
            <span style={{ fontWeight: 500, fontSize: "var(--text-md)" }}>Winged in a Week™ Agreement</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--fg-muted)", padding: "0.3rem", display: "flex", borderRadius: "0.5rem" }}>
            <X size={18} />
          </button>
        </div>

        <div className="contract-modal-body">
          <div className="contract-parties">
            <div className="contract-party">
              <div className="contract-eyebrow">Client</div>
              <div style={{ fontWeight: 500 }}>{project.clientName}</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>{project.clientEmail}</div>
            </div>
            <div className="contract-party">
              <div className="contract-eyebrow">Studio</div>
              <div style={{ fontWeight: 500 }}>The Mediamorphosys™</div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>baltazartrishajoan@gmail.com</div>
            </div>
          </div>

          <div className="contract-intro">
            <p>This agreement outlines the expectations, deliverables, timelines, and responsibilities for your <strong>Winged in a Week™</strong> project.</p>
            <p>Winged in a Week™ is powered by the <strong>Blended™ Framework</strong> — our approach that combines AI acceleration with human strategy, design, and implementation to help brands launch faster without sacrificing quality.</p>
          </div>

          <ContractSection title="What is Winged in a Week™?" defaultOpen>
            <p>A rapid website implementation service designed to take your project from planning to launch in as little as seven business days.</p>
            <p>Through our Blended™ Framework, we combine:</p>
            <ul>
              <li>Strategic planning</li>
              <li>Conversion-focused design</li>
              <li>AI-assisted acceleration</li>
              <li>Human-led implementation</li>
              <li>Quality assurance and optimization</li>
            </ul>
            <p><strong>Launch your website quickly, professionally, and with minimal involvement required from you.</strong></p>
          </ContractSection>

          <ContractSection title="Scope of Work">
            <p>The following deliverables are included:</p>
            <ol>
              <li>Website Design & Development</li>
              <li>Mobile Optimization</li>
              <li>Basic SEO Setup</li>
              <li>Technical Configuration</li>
              <li>Content Population</li>
              <li>Quality Assurance Testing</li>
              <li>Launch Support</li>
            </ol>
            <div className="contract-detail-grid">
              <div><span className="contract-eyebrow">Estimated completion</span><strong>7 Business Days</strong></div>
              <div><span className="contract-eyebrow">Project start</span><strong>{project.startDate}</strong></div>
            </div>
          </ContractSection>

          <ContractSection title="Investment & Payment">
            <p>Payment is structured as follows:</p>
            <ul>
              <li>50% deposit to begin</li>
              <li>50% final payment prior to launch</li>
            </ul>
            <p>Work will commence once the initial deposit has been received.</p>
          </ContractSection>

          <ContractSection title="Client Responsibilities">
            <p>To ensure the project remains on schedule, the client agrees to provide:</p>
            <ul>
              <li>Brand assets</li>
              <li>Website content</li>
              <li>Logins and access credentials</li>
              <li>Feedback within 24 to 48 hours when requested</li>
            </ul>
            <p>Delays in providing required materials may affect the agreed timeline.</p>
          </ContractSection>

          <ContractSection title="Revisions">
            <p>Winged in a Week™ is designed for speed and efficiency. The project includes:</p>
            <ul>
              <li>One consolidated revision round per page or section</li>
            </ul>
            <p>Additional revisions or scope changes beyond the agreed deliverables may require a separate estimate.</p>
          </ContractSection>

          <ContractSection title="Intellectual Property">
            <p>Upon receipt of final payment:</p>
            <ul>
              <li>The client retains ownership of their website content and assets.</li>
              <li>The Mediamorphosys™ retains ownership of proprietary processes, frameworks, systems, templates, and methodologies used during project delivery.</li>
            </ul>
          </ContractSection>

          <ContractSection title="Refund Policy">
            <p>Due to the nature of digital services and intellectual property:</p>
            <ul>
              <li>Deposits are non-refundable once work has commenced.</li>
              <li>If cancellation occurs before work begins, refunds may be issued subject to payment processor policies and fees.</li>
            </ul>
          </ContractSection>

          <ContractSection title="Portfolio Rights">
            <p>The client grants The Mediamorphosys™ permission to showcase completed work for:</p>
            <ul>
              <li>Portfolio purposes</li>
              <li>Marketing materials</li>
              <li>Case studies</li>
              <li>Written and video testimonials</li>
            </ul>
            <p>Unless otherwise agreed in writing.</p>
          </ContractSection>

          <div className="contract-footer">
            <div>
              <div className="contract-eyebrow">Effective date</div>
              <div style={{ fontWeight: 500, marginTop: "0.15rem" }}>{project.startDate}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "var(--text-xs)", color: "var(--success)", fontWeight: 500 }}>
              <Check size={13} /> Agreement active
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
