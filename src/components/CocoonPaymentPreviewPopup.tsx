import { CheckCircle2, X } from "lucide-react";

export function CocoonPaymentPreviewPopup({ onClose, onConfirmPaid }: { onClose: () => void; onConfirmPaid?: () => void }) {
  return (
    <>
      <div className="cocoon-popup-backdrop" onClick={onClose} />
      <div className="cocoon-payment-popup" role="dialog" aria-modal="true" aria-label="Wise payment preview">
        <button type="button" className="cocoon-payment-close" onClick={onClose} aria-label="Close payment preview"><X size={16} /></button>
        <span className="cocoon-final-eyebrow">Manual Wise billing</span>
        <h3>Payment email goes out next.</h3>
        <p>In the live workflow, Baltazar Studio sends the Wise payment email with QR details. Once payment is confirmed, we send the booking link for the one-on-one call.</p>
        {onConfirmPaid && (
          <button
            type="button"
            className="cocoon-payment-confirm-btn"
            onClick={() => {
              onConfirmPaid();
              onClose();
            }}
          >
            <CheckCircle2 size={15} />
            I already paid
          </button>
        )}
      </div>
    </>
  );
}
