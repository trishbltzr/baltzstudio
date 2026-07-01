import { Check, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode, type PointerEvent as ReactPointerEvent, useRef } from "react";

export type MobileNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  locked?: boolean;
  action?: () => void;
  toggled?: boolean;
};

export type MobileNavCenterAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  action: () => void;
  locked?: boolean;
};

export function MobileTabBar({ items, centerKey, activeKey, onSelect, centerActions = [], endItem, quickActionHint }: {
  items: MobileNavItem[];
  /** The nav key whose active state shows the raised gradient bubble (center slot). */
  centerKey: string;
  activeKey: string;
  onSelect: (key: string) => void;
  centerActions?: MobileNavCenterAction[];
  endItem?: MobileNavItem;
  quickActionHint?: ReactNode;
}) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null);
  const [centerMenuOpen, setCenterMenuOpen] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  function showTabToast(message: string) {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    setToast({ id: Date.now(), message });
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1500);
  }

  // Callers pass 4 primary items plus an optional 5th end tab.
  const allItems = endItem ? [...items, endItem] : items;

  return (
    <>
      {toast && (
        <div
          key={toast.id}
          className={`dashboard-tabbar-toast ${centerMenuOpen ? "is-raised" : ""}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
      {centerMenuOpen && centerActions.length > 0 && (
        <div className="dashboard-tabbar-action-cluster" aria-label="Quick actions">
          {quickActionHint && (
            <div className="dashboard-tabbar-action-hint">{quickActionHint}</div>
          )}
          {centerActions.map((action, index) => {
            const ActionIcon = action.icon;
            const lockedTitle = typeof quickActionHint === "string" ? quickActionHint : "Complete your Cocoon Consult to unlock";
            return (
              <button
                key={action.key}
                type="button"
                className={`dashboard-tabbar-action-chip dashboard-tabbar-action-chip--${index + 1}`}
                onClick={() => {
                  if (action.locked) return;
                  setCenterMenuOpen(false);
                  showTabToast(action.label);
                  action.action();
                }}
                disabled={action.locked}
                title={action.locked ? lockedTitle : action.label}
                aria-label={action.label}
              >
                <ActionIcon />
              </button>
            );
          })}
        </div>
      )}
      <nav className="dashboard-tabbar-mobile" aria-label="Primary navigation">
        {allItems.map(item => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          const isCenter = item.key === centerKey;
          const isLocked = !!item.locked;
          const count = item.count;

          let cls = "dashboard-tabbar-mobile-btn";
          if (isActive) cls += " is-active";
          if (isCenter) cls += " is-center";
          if (isLocked) cls += " is-locked";
          if (item.toggled || (isCenter && centerMenuOpen)) cls += " is-toggled";

          return (
            <button
              key={item.key}
              type="button"
              className={cls}
              onClick={() => {
                if (isLocked) return;
                if (isCenter && centerActions.length > 0) {
                  if (centerMenuOpen) {
                    setCenterMenuOpen(false);
                    return;
                  }
                  if (item.toggled) {
                    showTabToast(item.label);
                    item.action?.();
                    return;
                  }
                  setCenterMenuOpen(true);
                  return;
                }
                setCenterMenuOpen(false);
                showTabToast(item.label);
                if (item.action) { item.action(); return; }
                onSelect(item.key);
              }}
              aria-current={isActive ? "page" : undefined}
              aria-expanded={isCenter && centerActions.length > 0 ? centerMenuOpen : undefined}
              title={isLocked ? "Complete your Cocoon Consult to unlock" : undefined}
            >
              {/* Center slot is reserved for the raised primary mobile action. */}
              {isCenter ? (
                <span className="dashboard-tabbar-mobile-bubble">
                  <span className="dashboard-tabbar-mobile-bubble-inner">
                    <Icon color="white" />
                    {!isLocked && !!count && (
                      <span className="dashboard-tabbar-mobile-badge dashboard-tabbar-mobile-badge--bubble">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </span>
                </span>
              ) : (
                /* All other items: plain icon; dot rendered via CSS ::after on is-active */
                <span className="dashboard-tabbar-mobile-icon">
                  <Icon />
                  {!isLocked && !!count && (
                    <span className="dashboard-tabbar-mobile-badge">{count > 9 ? "9+" : count}</span>
                  )}
                </span>
              )}
              <span className="dashboard-tabbar-mobile-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

// Shared slide-up bottom sheet shell. Reuses the PhaseDetailModal overlay
// pattern (fixed backdrop + card, onClose callback, stopPropagation) but
// anchored to the bottom edge, matching native mobile sheet UX.
//
// Swipe-to-dismiss: drag the top handle downward to close, like a native
// bottom sheet — no need to tap the backdrop. Tracked via pointer events
// (works for touch + mouse) scoped to just the handle, so it never fights
// with scrolling the content beneath it.
export function BottomSheet({ title, onClose, children, labelledBy }: {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
}) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);

  const onHandlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = e.clientY;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onHandlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setDragY(Math.max(0, e.clientY - dragStartYRef.current));
  };
  const endDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > 90) onClose();
    setDragY(0);
  };

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.45)", zIndex: 1000 }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "var(--surface)",
          borderRadius: "1.25rem 1.25rem 0 0",
          border: "1px solid var(--border)",
          borderBottom: "none",
          maxHeight: "80vh",
          overflow: "auto",
          zIndex: 1001,
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? "none" : "transform 0.2s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          aria-hidden="true"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ display: "flex", justifyContent: "center", padding: "0.7rem 0 0.3rem", cursor: "grab", touchAction: "none" }}
        >
          <span style={{ width: "2.25rem", height: "0.28rem", borderRadius: "999px", background: "var(--border)" }} />
        </div>
        {title != null && (
          <div id={labelledBy} style={{ padding: "0.4rem 1.25rem 0.5rem", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--fg-muted)" }}>{title}</div>
        )}
        {children}
      </div>
    </>
  );
}

export type ClientSwitcherOption = {
  id: string;
  initials: string;
  name: string;
  /** Secondary line, e.g. "Webflow · M3 Launch · Complete". */
  sub: string;
  /** Optional right-side progress badge shown on inactive rows, e.g. "24/45". */
  badge?: string;
};

export function ClientSwitcherSheet({ clients, activeId, onSelect, onClose, footer }: {
  clients: ClientSwitcherOption[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  footer?: ReactNode;
}) {
  return (
    <BottomSheet title="Switch client" onClose={onClose} labelledBy="client-switcher-title">
      <div className="dashboard-client-switcher-list">
        {clients.map(client => {
          const isActive = client.id === activeId;
          return (
            <button
              key={client.id}
              type="button"
              className={`dashboard-client-switcher-row ${isActive ? "is-active" : ""}`}
              onClick={() => { onClose(); onSelect(client.id); }}
              aria-current={isActive ? "true" : undefined}
            >
              <span className="dashboard-client-switcher-avatar" aria-hidden="true">{client.initials}</span>
              <span className="dashboard-client-switcher-meta">
                <span className="dashboard-client-switcher-name">{client.name}</span>
                <span className="dashboard-client-switcher-sub">{client.sub}</span>
              </span>
              {isActive
                ? <Check size={16} className="dashboard-client-switcher-check" aria-label="Currently viewing" />
                : (client.badge ? <span className="dashboard-client-switcher-badge">{client.badge}</span> : null)}
            </button>
          );
        })}
      </div>
      {footer && <div className="dashboard-client-switcher-footer">{footer}</div>}
    </BottomSheet>
  );
}
