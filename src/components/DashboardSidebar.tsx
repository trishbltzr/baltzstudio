"use client";
import { ArrowRight, BadgeCheck, Check, ChevronDown, ChevronRight, Lock, Rocket, type LucideIcon } from "lucide-react";
import React, { Fragment, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Project } from "../types";
import { AccountMenu } from "./legal";

export interface NavChild {
  id: string;
  label: string;
  icon: LucideIcon;
  locked?: boolean;
}

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  locked?: boolean;
  iconSize?: number;
  children?: NavChild[];
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export interface FooterMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  locked?: boolean;
}

interface Props {
  activeNav: string;
  onNavChange: (nav: string) => void;
  navSections: NavSection[];
  collapsed: boolean;
  onLogout: () => void;

  // Brand row
  brandMark: string;
  brandName: string;
  brandSub: string;
  brandPlan?: string;

  // Admin-only: interactive project switcher (shown when projects is provided)
  projects?: Project[];
  selectedProjectId?: string;
  onSelectProject?: (id: string) => void;

  // Client-only: non-interactive project display for pre-Cocoon state
  clientProject?: Project;

  // Client-only: upgrade nudge card (shown when collaborationLocked is true)
  collaborationLocked?: boolean;
  onUpgrade?: () => void;

  // Footer AccountMenu
  footerAvatarLabel: string;
  footerName: string;
  footerSub: string;
  footerItems: FooterMenuItem[];
  footerShowPrivacyLinks?: boolean;
}

export function DashboardSidebar({
  activeNav,
  onNavChange,
  navSections,
  collapsed,
  onLogout,
  brandMark,
  brandName,
  brandSub,
  brandPlan,
  projects,
  selectedProjectId,
  onSelectProject,
  clientProject,
  collaborationLocked,
  onUpgrade,
  footerAvatarLabel,
  footerName,
  footerSub,
  footerItems,
  footerShowPrivacyLinks,
}: Props) {
  const workflowNudge = clientProject?.workflow;
  const nudgeTitle = workflowNudge?.sidebarNudgeTitle ?? "Turn the audit into a build";
  const nudgeBody = workflowNudge?.sidebarNudgeBody ?? "Move from insight to launch with Winged in a Week™.";
  const nudgeButton = workflowNudge?.nextStepLabel ?? "Upgrade to WIAW";

  // ── Locked-item toast ──────────────────────
  const [lockedToast, setLockedToast] = useState<string | null>(null);
  const showLockedToast = (label: string) => {
    setLockedToast(`Avail Winged in a Week to unlock ${label}`);
    setTimeout(() => setLockedToast(null), 3500);
  };

  // ── Admin project switcher (portal dropdown) ──────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = projects?.find(p => p.id === selectedProjectId) ?? projects?.[0];

  const repositionMenu = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 12;
    const width = Math.max(r.width, 240);
    let left = r.left;
    if (left + width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - width - margin);
    setMenuCoords({ top: r.bottom + 6, left, width });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    repositionMenu();
    const h = () => repositionMenu();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, [menuOpen, repositionMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [menuOpen]);

  // ── Collapsed-state tooltip ────────────────────────────────────────
  const [navTooltip, setNavTooltip] = useState<{ label: string; top: number; left: number } | null>(null);
  const showNavTooltip = useCallback((e: React.MouseEvent, label: string) => {
    if (!collapsed) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setNavTooltip({ label, top: r.top + r.height / 2, left: r.right + 10 });
  }, [collapsed]);
  const hideNavTooltip = useCallback(() => setNavTooltip(null), []);
  useEffect(() => { if (!collapsed) setNavTooltip(null); }, [collapsed]);

  // ── Child popover (collapsed state, items with children) ──────────
  type ChildPopover = { parentId: string; label: string; top: number; left: number; children: NavChild[] };
  const [childPopover, setChildPopover] = useState<ChildPopover | null>(null);
  const childPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!childPopover) return;
    const h = (e: MouseEvent) => {
      if (childPopoverRef.current?.contains(e.target as Node)) return;
      setChildPopover(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [childPopover]);

  useEffect(() => { if (!collapsed) setChildPopover(null); }, [collapsed]);

  // ── Open parents (expanded state accordion) ───────────────────────
  const [openParents, setOpenParents] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const section of navSections) {
      for (const item of section.items) {
        if (item.children?.length) initial.add(item.id);
        if (item.children?.some(c => c.id === activeNav)) initial.add(item.id);
      }
    }
    return initial;
  });

  // Auto-open the parent when navigating to one of its children
  useEffect(() => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (item.children?.some(c => c.id === activeNav)) {
          setOpenParents(prev => {
            if (prev.has(item.id)) return prev;
            const next = new Set(prev);
            next.add(item.id);
            return next;
          });
        }
      }
    }
  // navSections structure is stable across renders — only activeNav triggers re-check
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNav]);

  // ── Upgrade popover (client collapsed state) ───────────────────────
  const upgradeBtnRef = useRef<HTMLButtonElement>(null);
  const upgradePopoverRef = useRef<HTMLDivElement>(null);
  const [upgradePopoverOpen, setUpgradePopoverOpen] = useState(false);
  const [upgradePopoverCoords, setUpgradePopoverCoords] = useState<{ top: number; left: number } | null>(null);

  const repositionUpgradePopover = useCallback(() => {
    const el = upgradeBtnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setUpgradePopoverCoords({ top: r.top, left: r.right + 10 });
  }, []);

  useEffect(() => {
    if (!upgradePopoverOpen) return;
    repositionUpgradePopover();
    const h = () => repositionUpgradePopover();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => { window.removeEventListener("scroll", h, true); window.removeEventListener("resize", h); };
  }, [upgradePopoverOpen, repositionUpgradePopover]);

  useEffect(() => {
    if (!upgradePopoverOpen) return;
    const h = (e: MouseEvent) => {
      if (upgradeBtnRef.current?.contains(e.target as Node) || upgradePopoverRef.current?.contains(e.target as Node)) return;
      setUpgradePopoverOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [upgradePopoverOpen]);

  return (
    <aside className={`dashboard-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      {/* Brand row */}
      <div className="dashboard-brand-row" style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <div className="dashboard-mark">{brandMark}</div>
        <div style={{ flex: 1 }}>
          <div className="dashboard-brand">{brandName}</div>
	          {brandPlan ? (
	            <div className="dashboard-plan-meta">
	              <strong>{brandPlan}</strong>
	            </div>
          ) : (
            <div className="dashboard-muted">{brandSub}</div>
          )}
        </div>
      </div>

      <div style={{ margin: "0 -1.15rem", height: "1px", background: "var(--border-soft)" }} />

      {/* Admin: interactive project switcher */}
      {projects && selected && (
        <div style={{ position: "relative" }}>
          <button
            type="button"
            ref={triggerRef}
            className="dashboard-project-switcher"
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
          >
            <div className="dashboard-project-icon">{selected.clientInitials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.clientName}</strong>
              <small>{selected.platform}</small>
            </div>
            <ChevronDown size={13} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
          </button>
          {menuOpen && menuCoords && createPortal(
            <div
              ref={menuRef}
              className="dashboard-project-menu"
              style={{ position: "fixed", top: menuCoords.top, left: menuCoords.left, width: menuCoords.width }}
            >
              {projects.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={selectedProjectId === p.id ? "is-active" : ""}
                  onClick={() => { onSelectProject?.(p.id); setMenuOpen(false); }}
                >
                  <div className="dashboard-project-icon" style={{ width: "1.6rem", height: "1.6rem", borderRadius: "0.45rem", fontSize: "var(--text-xs)" }}>{p.clientInitials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "var(--text-base)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.clientName}</div>
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--fg-muted)" }}>{p.platform}</div>
                  </div>
                  {selectedProjectId === p.id && <Check size={11} style={{ marginLeft: "auto", color: "var(--success)" }} />}
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="dashboard-nav">
        {navSections.map((section, sIdx) => (
          <Fragment key={sIdx}>
            {section.label && (
              <div className={`dashboard-nav-section${sIdx > 0 ? " has-divider" : ""}`}>
                {section.label}
              </div>
            )}
            {section.items.map(item => {
              const Icon = item.icon;
              const isLocked = item.locked;
              const hasChildren = !!(item.children?.length);
              const isParentActive = activeNav === item.id;
              const hasActiveChild = hasChildren && item.children!.some(c => c.id === activeNav);
              const isOpen = openParents.has(item.id);
              const childPopoverOpen = childPopover?.parentId === item.id;

              const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
                if (isLocked) return;
                if (collapsed && hasChildren) {
                  const r = e.currentTarget.getBoundingClientRect();
                  setChildPopover(prev =>
                    prev?.parentId === item.id ? null : { parentId: item.id, label: item.label, top: r.top, left: r.right + 8, children: item.children! }
                  );
                } else {
                  onNavChange(item.id);
                }
              };

              return (
                <Fragment key={item.id}>
                  {/* Parent with children uses a toggle; leaf items navigate directly */}
                  {hasChildren && !collapsed ? (
                    <button
                      type="button"
                      className={`dashboard-nav-item is-parent ${hasActiveChild ? "has-active-child" : ""} ${isLocked ? "is-locked" : ""}`}
                      style={isLocked ? { opacity: 0.45, cursor: "default" } : undefined}
                      onClick={() => {
                        if (isLocked) { showLockedToast(item.label); return; }
                        setOpenParents(prev => {
                          const next = new Set(prev);
                          next.has(item.id) ? next.delete(item.id) : next.add(item.id);
                          return next;
                        });
                      }}
                    >
                      <Icon />
                      <span>{item.label}</span>
                      {isOpen
                        ? <ChevronDown size={13} style={{ marginLeft: "auto", opacity: 0.45, flexShrink: 0 }} />
                        : <ChevronRight size={13} style={{ marginLeft: "auto", opacity: 0.45, flexShrink: 0 }} />
                      }
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`dashboard-nav-item ${isParentActive ? "is-active" : ""} ${isLocked ? "is-locked" : ""}`}
                      onClick={isLocked ? () => showLockedToast(item.label) : handleClick}
                      style={isLocked ? { opacity: 0.45, cursor: "default" } : undefined}
                      onMouseEnter={e => showNavTooltip(e, item.label)}
                      onMouseLeave={hideNavTooltip}
                    >
                      <Icon size={item.iconSize} />
                      <span>{item.label}</span>
                      {!isLocked && item.count ? <span className="dashboard-count">{item.count}</span> : null}
                    </button>
                  )}

                  {/* Children list (expanded state) */}
                  {!collapsed && hasChildren && isOpen && (
                    <div className="dashboard-nav-children">
                      {item.children!.map(child => {
                        const ChildIcon = child.icon;
                        return (
                          <button
                            key={child.id}
                            type="button"
                            className={`dashboard-nav-item dashboard-nav-subitem ${activeNav === child.id ? "is-active" : ""} ${child.locked ? "is-locked" : ""}`}
                            onClick={() => child.locked ? showLockedToast(child.label) : onNavChange(child.id)}
                            style={child.locked ? { opacity: 0.45, cursor: "default" } : undefined}
                          >
                            <ChildIcon size={13} />
                            <span>{child.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Child popover (collapsed state, portal) */}
                  {collapsed && childPopoverOpen && childPopover && createPortal(
                    <div
                      ref={childPopoverRef}
                      className="sidebar-child-popover"
                      style={{ position: "fixed", top: childPopover.top, left: childPopover.left, zIndex: 1200 }}
                    >
                      <div className="sidebar-child-popover-label">{childPopover.label}</div>
                      {childPopover.children.map(child => {
                        const ChildIcon = child.icon;
                        return (
                          <button
                            key={child.id}
                            type="button"
                            className={`sidebar-child-popover-item ${activeNav === child.id ? "is-active" : ""}`}
                            onClick={() => { if (child.locked) { showLockedToast(child.label); } else { onNavChange(child.id); setChildPopover(null); } }}
                            style={child.locked ? { opacity: 0.45, cursor: "default" } : undefined}
                          >
                            <ChildIcon size={13} />
                            <span>{child.label}</span>
                          </button>
                        );
                      })}
                    </div>,
                    document.body
                  )}
                </Fragment>
              );
            })}
          </Fragment>
        ))}
      </nav>

      {/* Collapsed tooltip */}
      {collapsed && navTooltip && createPortal(
        <div className="sidebar-nav-tooltip" style={{ top: navTooltip.top, left: navTooltip.left }}>
          {navTooltip.label}
        </div>,
        document.body
      )}

      {/* Client-only: upgrade nudge card */}
      {collaborationLocked && (
        collapsed ? (
          <>
            <button
              ref={upgradeBtnRef}
              type="button"
              className="sidebar-upgrade-icon-btn"
              onClick={() => setUpgradePopoverOpen(v => !v)}
              title={nudgeButton}
            >
              <Rocket size={14} style={{ color: "white" }} />
            </button>
            {upgradePopoverOpen && upgradePopoverCoords && createPortal(
              <div
                ref={upgradePopoverRef}
                className="sidebar-upgrade-card sidebar-upgrade-popover"
                style={{ position: "fixed", top: upgradePopoverCoords.top, left: upgradePopoverCoords.left, width: 220, zIndex: 1200 }}
              >
                <div className="sidebar-upgrade-header">
                  <BadgeCheck size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                  <span className="sidebar-upgrade-eyebrow">Launch path</span>
                </div>
                <div className="sidebar-upgrade-plan">{nudgeTitle}</div>
                <p className="sidebar-upgrade-desc">
                  {nudgeBody}
                </p>
                <button type="button" className="sidebar-upgrade-btn" onClick={() => { onUpgrade?.(); setUpgradePopoverOpen(false); }}>
                  {nudgeButton} <ArrowRight size={11} />
                </button>
              </div>,
              document.body
            )}
          </>
        ) : (
          <div className="sidebar-upgrade-card">
            <div className="sidebar-upgrade-header">
              <BadgeCheck size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span className="sidebar-upgrade-eyebrow">Launch path</span>
            </div>
            <div className="sidebar-upgrade-plan">{nudgeTitle}</div>
            <p className="sidebar-upgrade-desc">
              {nudgeBody}
            </p>
            <button type="button" className="sidebar-upgrade-btn" onClick={onUpgrade}>
              {nudgeButton} <ArrowRight size={11} />
            </button>
          </div>
        )
      )}

      <div className="dashboard-sidebar-footer">
        <AccountMenu
          avatarLabel={footerAvatarLabel}
          name={footerName}
          subtitle={footerSub}
          collapsed={collapsed}
          onLogout={onLogout}
          showPrivacyLinks={footerShowPrivacyLinks}
          items={footerItems}
        />
      </div>

      {lockedToast && createPortal(
        <div className="toast"><Lock size={14} />{lockedToast}</div>,
        document.body
      )}
    </aside>
  );
}
