import { ArrowRight, CheckCircle2, ClipboardList, Eye } from "lucide-react";
import type { MeetingDetails } from "./MeetingScheduler";

const paidCocoonBenefits = [
  {
    title: "Editable three-month dashboard access",
    detail: "Hand the dashboard to your agency or use it as the DIY project hub to manage next steps yourself.",
    emphasis: "Unlimited",
  },
  {
    title: "One-on-one guided audit call",
    detail: "Walk through priorities and next decisions with Trisha.",
  },
  {
    title: "DIY-ready strategy files",
    detail: "Keep the audit, checklist, strategy notes, and branded direction together for your own team or build partner.",
  },
];

export function CocoonFinalStepPanel({
  callScheduled,
  scheduledMeeting,
  onOpenPrepList,
  onOpenAuditPreview,
  onOpenPaymentPreview,
  onOpenScheduler,
}: {
  callScheduled: boolean;
  scheduledMeeting: MeetingDetails | null;
  onOpenPrepList: () => void;
  onOpenAuditPreview: () => void;
  onOpenPaymentPreview: () => void;
  onOpenScheduler: () => void;
}) {
  return (
    <div className="cocoon-final-screen">
      <div className="cocoon-next-steps">
        <h4 className="cocoon-next-steps-title">What happens next</h4>

        <div className="cocoon-step-card">
          <div className="cocoon-step-card-num">1</div>
          <div className="cocoon-step-card-body">
            <strong>Review the audit preview</strong>
            <p>Start with the report themes so the next step is based on the actual gaps, not a guess.</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.65rem" }}>
              <button type="button" onClick={onOpenPrepList} className="cocoon-preview-audit-btn">
                <ClipboardList size={14} /> Prep List
              </button>
              <button type="button" onClick={onOpenAuditPreview} className="cocoon-preview-audit-btn">
                <Eye size={14} /> Preview Audit
              </button>
            </div>
          </div>
        </div>

        <div className="cocoon-step-card is-highlight">
          <div className="cocoon-step-card-num">2</div>
          <div className="cocoon-step-card-body">
            <strong className="cocoon-premium-name">
              Upgrade to Cocoon Consult <span className="cocoon-premium-badge">Premium</span>
            </strong>
            <p>Choose the guided review path. We will send the Wise payment details after you confirm.</p>
            <div className="cocoon-inclusions">
              <span className="cocoon-inclusions-label">What's included:</span>
              <ul className="cocoon-inclusions-list">
                {paidCocoonBenefits.map(item => (
                  <li key={item.title}>
                    <strong>{item.title}{item.emphasis && <span className="cocoon-unlimited-label">{item.emphasis}</span>}</strong>
                    <span>{item.detail}</span>
                  </li>
                ))}
              </ul>
              <div className="cocoon-premium-outcome">
                <span>Final outcome</span>
                <strong>Full-funnel clarity call + complete funnel strategy</strong>
                <p>Leave with the priorities, documents, and branded visual direction gathered into one practical next-step plan.</p>
                <button type="button" onClick={onOpenPaymentPreview} className="cocoon-outcome-cta">
                  Upgrade to Premium <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="cocoon-step-card">
          <div className="cocoon-step-card-num">3</div>
          <div className="cocoon-step-card-body">
            <strong>Booking link</strong>
            <p>After payment is confirmed, we send the booking link for your one-on-one call.</p>
          </div>
        </div>
      </div>

      {callScheduled ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", padding: "1rem 1.25rem", background: "var(--accent-soft)", border: "1px solid var(--border)", borderRadius: "var(--radius)", color: "var(--fg)" }}>
          <CheckCircle2 size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: "var(--text-md)", fontWeight: 500 }}>Your call is on the calendar</div>
            <div style={{ fontSize: "var(--text-base)", color: "var(--fg-muted)", marginTop: "0.1rem" }}>{scheduledMeeting ? `${scheduledMeeting.dateLabel}, ${scheduledMeeting.startTime} – ${scheduledMeeting.endTime}` : "We'll send a confirmation with the call details."}</div>
          </div>
          <button type="button" onClick={onOpenScheduler} style={{ marginLeft: "auto", padding: "0.5rem 0.9rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "var(--text-sm)", fontWeight: 500, fontFamily: "inherit", color: "var(--fg)", cursor: "pointer", flexShrink: 0 }}>
            Reschedule
          </button>
        </div>
      ) : null}
    </div>
  );
}
