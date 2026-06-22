import { Lock, MoreHorizontal, type LucideIcon } from "lucide-react";
import { useState, type ReactNode, type PointerEvent as ReactPointerEvent, useRef } from "react";

export type MobileNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  locked?: boolean;
};

// Brand gradient — matches the coral/salmon palette used throughout the dashboard
const NAV_GRADIENT = "linear-gradient(135deg, oklch(0.78 0.11 22), oklch(0.7 0.13 18))";

export function MobileTabBar({ items, centerKey, activeKey, onSelect, moreActive, onMore }: {
  items: MobileNavItem[];
  /** The nav key whose active state shows the raised gradient bubble (center slot). */
  centerKey: string;
  activeKey: string;
  onSelect: (key: string) => void;
  moreActive: boolean;
  onMore: () => void;
}) {
  // Callers pass exactly 4 primary items; we append the "More" button as slot 5.
  const allItems = [
    ...items.map(item => ({ ...item, isMore: false as const })),
    { key: "__more__", label: "More", icon: MoreHorizontal, isMore: true as const, locked: false },
  ];

  return (
    <nav className="dashboard-tabbar-mobile" aria-label="Primary navigation">
      {allItems.map(item => {
        const Icon = item.icon;
        const isActive = item.isMore ? moreActive : activeKey === item.key;
        const isCenter = !item.isMore && item.key === centerKey;
        const isLocked = !item.isMore && !!(item as MobileNavItem).locked;
        const count = !item.isMore ? (item as MobileNavItem).count : undefined;

        let cls = "dashboard-tabbar-mobile-btn";
        if (isActive) cls += " is-active";
        if (isCenter) cls += " is-center";
        if (isLocked) cls += " is-locked";

        return (
          <button
            key={item.key}
            type="button"
            className={cls}
            onClick={() => {
              if (isLocked) return;
              if (item.isMore) { onMore(); return; }
              onSelect(item.key);
            }}
            aria-current={isActive && !item.isMore ? "page" : undefined}
            aria-haspopup={item.isMore ? "true" : undefined}
            aria-expanded={item.isMore ? moreActive : undefined}
            title={isLocked ? "Complete your Cocoon Consult to unlock" : undefined}
          >
            {/* Center item when active: raised gradient bubble */}
            {isActive && isCenter ? (
              <span className="dashboard-tabbar-mobile-bubble">
                <span className="dashboard-tabbar-mobile-bubble-inner" style={{ background: NAV_GRADIENT }}>
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
  );
}

export function MoreSheet({ title, items, activeKey, onSelect, onClose, footer }: {
  title: string;
  items: MobileNavItem[];
  activeKey?: string;
  onSelect: (key: string) => void;
  onClose: () => void;
  footer?: ReactNode;
}) {
  // Reuses the PhaseDetailModal overlay pattern (fixed backdrop + card,
  // onClose callback, stopPropagation) but anchored to the bottom edge as a
  // slide-up sheet rather than centered, matching native mobile sheet UX.
  //
  // Swipe-to-dismiss: drag the top handle downward to close, like a native
  // bottom sheet — no need to tap the backdrop. Tracked via pointer events
  // (works for touch + mouse) scoped to just the handle, so it never fights
  // with scrolling the item list beneath it.
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
        <div style={{ padding: "0.4rem 1.25rem 0.5rem", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--fg-muted)" }}>{title}</div>
        <div className="dashboard-more-sheet-list">
          {items.map(item => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`dashboard-more-sheet-item ${isActive ? "is-active" : ""}`}
                onClick={() => { if (item.locked) return; onClose(); onSelect(item.key); }}
                style={item.locked ? { opacity: 0.42, cursor: "default" } : undefined}
                title={item.locked ? "Complete your Cocoon Consult to unlock" : undefined}
              >
                <Icon />
                <span>{item.label}</span>
                {item.locked
                  ? <Lock size={12} style={{ marginLeft: "auto", opacity: 0.6, flexShrink: 0 }} />
                  : (!!item.count ? <span className="dashboard-count">{item.count}</span> : null)}
              </button>
            );
          })}
        </div>
        {footer && <div className="dashboard-more-sheet-footer">{footer}</div>}
      </div>
    </>
  );
}
