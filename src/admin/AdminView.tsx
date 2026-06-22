import { Bell, CheckCircle2, ChevronDown, ClipboardList, Folder, Home, LayoutDashboard, ChevronsLeft, ChevronsRight, Paperclip, Plus, Settings, User, X } from "lucide-react";
import { useEffect, useState, useMemo, useRef } from "react";
import type { ClientLifecycleStage, Project, TaskStatus, BrandIdentity, AdminNav, ProjectTab, ClientNav } from "../types";
import { allGates, planAccess } from "../lib/projectUtils";
import { StatusBadge, TopbarHeading, ProgressBar, PanelHeader, Panel } from "../components/shared";
import { type MobileNavItem, MobileTabBar, MoreSheet } from "../components/mobileNav";
import { deriveAdminNotifications, NotificationBell, NotificationsPage } from "../components/notifications";
import { useIsMobile } from "../hooks/use-mobile";
import { AdminMilestonesTab, AdminReviewsTab, BrandGuidelinesPanel, AdminNotesTab } from "./AdminTabs";
import { ClientMilestonesTab, ClientOverviewTab } from "../client/ClientTabs";
import { ContractModal } from "../components/ContractModal";
import { AccountMenu } from "../components/legal";
import { DashboardSidebar } from "../components/DashboardSidebar";
import { FileAssetHub } from "../components/FileAssetHub";
import { FILE_WORKSPACE_ITEMS, FILE_WORKSPACE_TITLES } from "../components/fileWorkspace";

// ─────────────────────────────────────────────
// ADMIN — MAIN VIEW
// ─────────────────────────────────────────────

function accessForAdminAccountRole(role: string) {
  if (role === "Studio admin") return "Can manage project";
  if (role === "Client owner") return "Can review and approve";
  return "Can view client portal";
}

function isProjectTab(value: string | undefined): value is ProjectTab {
  return value === "overview" || value === "milestones" || value === "assets" || value === "brand-guidelines" || value === "audit" || value === "notes";
}

function isAdminTopNav(value: string | undefined): value is AdminNav {
  return value === "home" || value === "projects" || value === "reviews" || value === "assets" || value === "users" || value === "settings" || value === "notifications";
}

const CLIENT_PLAN_OPTIONS: Array<{ stage: ClientLifecycleStage; label: string; tier?: "Free" | "Premium" }> = [
  { stage: "paid-cocoon", label: "Cocoon Consult", tier: "Premium" },
  { stage: "wiaw-active", label: "Winged in a Week" },
];

function planTierForStage(stage: ClientLifecycleStage) {
  if (stage === "paid-cocoon") return "Premium";
  return null;
}

function AdminPlanSelector({
  stage,
  onChange,
}: {
  stage: ClientLifecycleStage;
  onChange: (stage: ClientLifecycleStage) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const selectedOption = CLIENT_PLAN_OPTIONS.find(option => option.stage === stage) ?? CLIENT_PLAN_OPTIONS[0];
  const selectedTier = selectedOption.tier ?? planTierForStage(stage);

  return (
    <div className="admin-plan-selector">
      <span className="admin-plan-selector-label">Current plan</span>
      <details className="admin-plan-dropdown" ref={detailsRef}>
        <summary className="dashboard-dropdown-control admin-plan-trigger" aria-label="Change client current plan">
          <span className="admin-plan-trigger-text">{selectedOption.label}</span>
          {selectedTier && <span className={`plan-tier-badge plan-tier-badge--${selectedTier.toLowerCase()}`}>{selectedTier}</span>}
          <ChevronDown size={13} aria-hidden="true" />
        </summary>
        <div className="admin-plan-menu" role="listbox" aria-label="Client current plan">
          {CLIENT_PLAN_OPTIONS.map(option => {
            const isSelected = option.stage === stage;
            return (
              <button
                key={option.stage}
                type="button"
                className={`admin-plan-option${isSelected ? " is-selected" : ""}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.stage);
                  detailsRef.current?.removeAttribute("open");
                }}
              >
                <span className="admin-plan-option-main">
                  <span>{option.label}</span>
                  {option.tier && <span className={`plan-tier-badge plan-tier-badge--${option.tier.toLowerCase()}`}>{option.tier}</span>}
                </span>
                {isSelected && <CheckCircle2 size={14} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function AdminUsersModal({
  users,
  adding,
  newUser,
  onClose,
  onAddToggle,
  onNewUserChange,
  onSubmit,
}: {
  users: Array<{ name: string; email: string; role: string; access: string }>;
  adding: boolean;
  newUser: { name: string; email: string; role: string };
  onClose: () => void;
  onAddToggle: (open: boolean) => void;
  onNewUserChange: (user: { name: string; email: string; role: string }) => void;
  onSubmit: () => void;
}) {
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="account-setup-modal users-modal" role="dialog" aria-modal="true" aria-labelledby="account-setup-title">
        <div className="account-setup-head">
          <div>
            <span>Users</span>
            <h3 id="account-setup-title">Account Access</h3>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="users-modal-body">
          <div className="account-access-body">
            {users.map(person => (
              <div key={person.email} className="account-user-row">
                <span className="account-user-avatar">{person.name.slice(0, 2).toUpperCase()}</span>
                <div className="account-user-main">
                  <strong>{person.name}</strong>
                  <span>{person.email}</span>
                </div>
                <div className="account-user-meta">
                  <span>{person.role}</span>
                  <small>{person.access}</small>
                </div>
              </div>
            ))}
          </div>
          {adding ? (
            <form
              className="account-setup-form"
              onSubmit={event => {
                event.preventDefault();
                onSubmit();
              }}
            >
              <div className="account-setup-inline-fields">
                <input value={newUser.name} onChange={event => onNewUserChange({ ...newUser, name: event.target.value })} placeholder="Name" />
                <input type="email" value={newUser.email} onChange={event => onNewUserChange({ ...newUser, email: event.target.value })} placeholder="Email" />
                <select className="dashboard-select" value={newUser.role} onChange={event => onNewUserChange({ ...newUser, role: event.target.value })}>
                  <option>Collaborator</option>
                  <option>Client owner</option>
                  <option>Studio admin</option>
                </select>
              </div>
              <div className="account-setup-actions">
                <button type="button" className="btn" onClick={() => onAddToggle(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add</button>
              </div>
            </form>
          ) : (
            <button type="button" className="users-modal-add" onClick={() => onAddToggle(true)}>
              <Plus size={13} />
              Add User
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function AdminView({ projects, selectedProjectId, onSelectProject, onTaskStatusChange, onSendGate, onApproveGate, onDenyGate, onFinishMilestone, onBrandChange, onChangeProjectStage, onLogout, initialNav }: {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onSendGate: (gateId: string) => void;
  onApproveGate: (gateId: string) => void;
  onDenyGate: (gateId: string) => void;
  onFinishMilestone?: (milestoneId: string) => void;
  onBrandChange: (brand: BrandIdentity) => void;
  onChangeProjectStage: (stage: ClientLifecycleStage) => void;
  onLogout: () => void;
  initialNav?: string;
}) {
  const [adminNav, setAdminNav] = useState<AdminNav>(() => isProjectTab(initialNav) ? "projects" : isAdminTopNav(initialNav) ? initialNav : "projects");
  const [projectTab, setProjectTab] = useState<ProjectTab>(() => isProjectTab(initialNav) ? initialNav : "overview");
  const [contractOpen, setContractOpen] = useState(false);
  const project = projects.find(p => p.id === selectedProjectId) ?? projects[0]!;
  const access = planAccess(project);
  const [accountUsers, setAccountUsers] = useState(() => [
    { name: project.clientName, email: project.clientEmail, role: "Client owner", access: accessForAdminAccountRole("Client owner") },
    { name: "Trisha Baltazar", email: "studio@baltazarstudio.co", role: "Studio admin", access: accessForAdminAccountRole("Studio admin") },
  ]);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [addingAccountUser, setAddingAccountUser] = useState(false);
  const [newAccountUser, setNewAccountUser] = useState({ name: "", email: "", role: "Collaborator" });
  useEffect(() => {
    setAccountUsers(prev => {
      const clientOwner = { name: project.clientName, email: project.clientEmail, role: "Client owner", access: accessForAdminAccountRole("Client owner") };
      const rest = prev.filter(user => user.role !== "Client owner");
      return [clientOwner, ...rest];
    });
  }, [project.clientEmail, project.clientName]);
  const pendingReviews = useMemo(() => allGates(project).filter(g => g.gate.status === "sent" || g.gate.status === "ready").length, [project]);

  // Notification state lifted here so the Notifications nav page can use it
  const notifications = deriveAdminNotifications(project);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const unread = notifications.filter(n => !readIds.has(n.id) && !dismissedIds.has(n.id)).length;
  // Lifted (not local to NotificationsPage) so the account popover's
  // "Notification settings" shortcut can open straight into the settings pane.
  const [notifSettingsOpen, setNotifSettingsOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Mobile bottom-nav (replaces the sidebar at ≤768px) ──
  const isMobile = useIsMobile();
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  // 4 primary slots (+ "More" appended by MobileTabBar = 5 total).
  // Projects is slot 3 (center) — gets the raised gradient bubble.
  const adminMobilePrimary: MobileNavItem[] = [
    { key: "home",          label: "Home",          icon: Home },
    { key: "reviews",       label: "Reviews",        icon: CheckCircle2, count: pendingReviews, locked: !access.tasks },
    { key: "projects",      label: "Projects",       icon: Folder },
    { key: "notifications", label: "Notifications",  icon: Bell, count: unread },
  ];
  const adminMobileMore: MobileNavItem[] = [
    { key: "assets",   label: "Assets",   icon: Paperclip, locked: !access.assets },
    { key: "settings", label: "Settings", icon: Settings },
  ];
  const canOpenAdminNav = (nav: AdminNav) => {
    if (nav === "reviews") return access.tasks;
    if (nav === "assets") return access.assets;
    return true;
  };
  const canOpenProjectTab = (tab: ProjectTab) => {
    if (tab === "assets") return access.assets;
    if (tab === "brand-guidelines") return access.brandGuidelines;
    if (tab === "milestones") return access.milestones;
    return tab === "overview" || tab === "notes";
  };
  const handleAdminNavSelect = (key: string) => {
    const nav = key as AdminNav;
    if (!canOpenAdminNav(nav)) return;
    setAdminNav(nav);
    if (nav === "projects") setProjectTab("overview");
  };
  const handleAdminSidebarNavSelect = (nav: string) => {
    if (nav === "users") {
      if (!access.users) return;
      setAccountModalOpen(true);
      return;
    }
    if (nav === "contract") {
      if (!access.contract) return;
      setContractOpen(true);
      return;
    }
    if (nav === "overview" || nav === "milestones" || nav === "assets" || nav === "brand-guidelines" || nav === "notes") {
      if (!canOpenProjectTab(nav as ProjectTab)) return;
      setAdminNav("projects");
      setProjectTab(nav as ProjectTab);
      return;
    }
    if (isAdminTopNav(nav) && !canOpenAdminNav(nav)) return;
    setAdminNav(nav as AdminNav);
    if (nav === "projects") setProjectTab("overview");
  };
  useEffect(() => {
    if (adminNav === "reviews" && !access.tasks) {
      setAdminNav("projects");
      setProjectTab("overview");
      return;
    }
    if (adminNav === "assets" && !access.assets) {
      setAdminNav("projects");
      setProjectTab("overview");
      return;
    }
    if (adminNav === "projects" && !canOpenProjectTab(projectTab)) {
      setProjectTab("overview");
    }
    if (contractOpen && !access.contract) {
      setContractOpen(false);
    }
  }, [adminNav, projectTab, access.stage, contractOpen]);
  const activeSidebarNav = contractOpen ? "contract" : adminNav === "projects" ? projectTab : adminNav;
  const projectViewTitles: Record<ProjectTab, string> = {
    overview: "Overview",
    milestones: "Milestones",
    ...FILE_WORKSPACE_TITLES,
    audit: "Audit",
    notes: "Notes",
  };
  const handleAdminOverviewNav = (nav: ClientNav) => {
    if (nav === "reviews") {
      if (!access.tasks) return;
      setAdminNav("reviews");
      return;
    }
    if (nav === "milestones") {
      if (!access.milestones) return;
      setAdminNav("projects");
      setProjectTab("milestones");
      return;
    }
    if (nav === "contract") {
      if (!access.contract) return;
      setContractOpen(true);
      return;
    }
    if (nav === "files" || nav === "brand") {
      if (!access.assets) return;
      setAdminNav("projects");
      setProjectTab("assets");
      return;
    }
    if (nav === "brand-guidelines") {
      if (!access.brandGuidelines) return;
      setAdminNav("projects");
      setProjectTab("brand-guidelines");
      return;
    }
    setAdminNav("projects");
    setProjectTab("overview");
  };

  const adminNavSections = [
    { label: "Workspace", items: [
      { id: "overview",   label: "Overview",   icon: LayoutDashboard },
      { id: "milestones", label: "Milestones", icon: ClipboardList, locked: !access.milestones },
    ]},
    { label: "Collaboration", items: [
      { id: "reviews",       label: "Tasks",         icon: CheckCircle2, count: pendingReviews, locked: !access.tasks },
      { id: "users",         label: "Users",         icon: User, count: accountUsers.length, locked: !access.users },
      { id: "files",         label: "Files",         icon: Folder, locked: !access.files, children: [
        ...FILE_WORKSPACE_ITEMS.map(item => ({
          ...item,
          locked: item.id === "assets" ? !access.assets : item.id === "brand-guidelines" ? !access.brandGuidelines : !access.contract,
        })),
      ]},
      { id: "notifications", label: "Notifications", icon: Bell, count: unread },
    ]},
  ];

  return (
    <div className={`client-dashboard-shell ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      {!isMobile && (
        <DashboardSidebar
          activeNav={activeSidebarNav}
          onNavChange={handleAdminSidebarNavSelect}
          navSections={adminNavSections}
          collapsed={sidebarCollapsed}
          onLogout={onLogout}
          brandMark="BS"
          brandName="Baltazar Studio"
          brandSub="Admin workspace"
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={onSelectProject}
          footerAvatarLabel="T"
          footerName="Trisha Baltazar"
          footerSub="Studio admin"
          footerItems={[
            { key: "settings",      label: "Settings",              icon: Settings, onClick: () => setAdminNav("settings") },
            { key: "notif-settings", label: "Notification settings", icon: Bell,     onClick: () => { setAdminNav("notifications"); setNotifSettingsOpen(true); } },
          ]}
        />
      )}
      {!isMobile && (
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setSidebarCollapsed(c => !c)}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronsRight size={13} /> : <ChevronsLeft size={13} />}
        </button>
      )}

      <section className="dashboard-workspace">
        {adminNav === "home" && (
          <>
            <div className="dashboard-topbar">
              <TopbarHeading title="Home" />
              {!isMobile && <NotificationBell notifications={notifications} readIds={readIds} setReadIds={setReadIds} onViewAll={() => setAdminNav("notifications")} onApproveGate={onApproveGate} onDenyGate={onDenyGate} />}
            </div>
            <div className="dashboard-main">
              {/* auto-fit/minmax instead of a fixed 2-up — project cards stack
                  to a single column on phones instead of squeezing to ~160px. */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
                {projects.map(p => {
                  const prog = { done: p.milestones.flatMap(m => m.phases.flatMap(ph => ph.tasks)).filter(t => t.status === "complete").length, total: p.milestones.flatMap(m => m.phases.flatMap(ph => ph.tasks)).length };
                  const cur = p.milestones.find(m => m.status === "active");
                  return (
                    <Panel key={p.id} className="cursor-pointer">
                      <div style={{ padding: "1.1rem 1.25rem" }} onClick={() => { onSelectProject(p.id); setAdminNav("projects"); }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.85rem" }}>
                          <div className="dashboard-project-icon" style={{ width: "2.2rem", height: "2.2rem", borderRadius: "0.7rem", fontSize: "var(--text-base)" }}>{p.clientInitials}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>{p.clientName}</div>
                            <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)" }}>{p.platform}</div>
                          </div>
                          <StatusBadge status="is-active" label="Active" />
                        </div>
                        <ProgressBar {...prog} />
                        {cur && <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)", marginTop: "0.5rem" }}>M{cur.number} — {cur.title}</div>}
                      </div>
                    </Panel>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {adminNav === "projects" && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <div className="dashboard-topbar-heading-row">
                  <div className="dashboard-topbar-title">{projectViewTitles[projectTab]}</div>
                </div>
              </div>
              <div className="dashboard-topbar-actions admin-project-actions">
                <AdminPlanSelector stage={project.workflow?.stage ?? "wiaw-active"} onChange={onChangeProjectStage} />
                {!isMobile && <NotificationBell notifications={notifications} readIds={readIds} setReadIds={setReadIds} onViewAll={() => setAdminNav("notifications")} onApproveGate={onApproveGate} onDenyGate={onDenyGate} />}
              </div>
            </div>

            <div className="dashboard-main">
              {projectTab === "overview" && <ClientOverviewTab project={project} role="admin" onNavChange={handleAdminOverviewNav} />}
              {projectTab === "milestones" && (
                access.showAuditMilestones
                  ? <ClientMilestonesTab project={project} auditMode onTaskStatusChange={onTaskStatusChange} onFinishMilestone={onFinishMilestone} />
                  : <AdminMilestonesTab project={project} onTaskStatusChange={onTaskStatusChange} onSendGate={onSendGate} onApproveGate={onApproveGate} onFinishMilestone={onFinishMilestone} />
              )}
              {projectTab === "assets" && <FileAssetHub project={project} role="admin" />}
              {projectTab === "brand-guidelines" && <BrandGuidelinesPanel project={project} onBrandChange={onBrandChange} />}
              {projectTab === "notes" && <AdminNotesTab project={project} />}
            </div>
          </>
        )}

        {adminNav === "reviews" && (
          <>
            <div className="dashboard-topbar">
              <TopbarHeading title="Tasks" />
              {!isMobile && <NotificationBell notifications={notifications} readIds={readIds} setReadIds={setReadIds} onViewAll={() => setAdminNav("notifications")} onApproveGate={onApproveGate} onDenyGate={onDenyGate} />}
            </div>
            <div className="dashboard-main"><AdminReviewsTab project={project} onSendGate={onSendGate} onApproveGate={onApproveGate} onTaskStatusChange={onTaskStatusChange} /></div>
          </>
        )}

        {adminNav === "assets" && (
          <>
            <div className="dashboard-topbar">
              <TopbarHeading title="Assets" />
              {!isMobile && <NotificationBell notifications={notifications} readIds={readIds} setReadIds={setReadIds} onViewAll={() => setAdminNav("notifications")} onApproveGate={onApproveGate} onDenyGate={onDenyGate} />}
            </div>
            <div className="dashboard-main"><FileAssetHub project={project} role="admin" /></div>
          </>
        )}

        {adminNav === "settings" && (
          <>
            <div className="dashboard-topbar">
              <TopbarHeading title="Settings" />
              {!isMobile && <NotificationBell notifications={notifications} readIds={readIds} setReadIds={setReadIds} onViewAll={() => setAdminNav("notifications")} onApproveGate={onApproveGate} onDenyGate={onDenyGate} />}
            </div>
            <div className="dashboard-main">
              <Panel>
                <PanelHeader title="Agency settings" icon={Settings} />
                <div style={{ padding: "0.75rem 1.25rem 1rem" }}>
                  {[["Agency name", "Baltazar Studio"], ["Owner", "Trisha Baltazar"], ["Client portal", "baltazarstudio.co/portal"], ["Notifications", "On"]].map(([l, v]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "0.7rem 0", borderBottom: "1px solid oklch(0.925 0.026 45 / 0.4)", fontSize: "var(--text-md)" }}>
                      <span style={{ color: "var(--fg-muted)" }}>{l}</span>
                      <span style={{ fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </>
        )}

        {adminNav === "notifications" && (
          <>
            <div className="dashboard-topbar">
              <TopbarHeading title="Notifications" />
              {!isMobile && <NotificationBell notifications={notifications} readIds={readIds} setReadIds={setReadIds} onViewAll={() => setAdminNav("notifications")} onApproveGate={onApproveGate} onDenyGate={onDenyGate} />}
            </div>
            <div className="dashboard-main">
              <NotificationsPage
                notifications={notifications}
                readIds={readIds} setReadIds={setReadIds}
                dismissedIds={dismissedIds} setDismissedIds={setDismissedIds}
                onNavigate={() => { setAdminNav("projects"); setProjectTab("overview"); }}
                settingsOpen={notifSettingsOpen} setSettingsOpen={setNotifSettingsOpen}
              />
            </div>
          </>
        )}
      </section>

      {contractOpen && (
        <ContractModal project={project} onClose={() => setContractOpen(false)} />
      )}

      {accountModalOpen && (
        <AdminUsersModal
          users={accountUsers}
          adding={addingAccountUser}
          newUser={newAccountUser}
          onClose={() => {
            setAccountModalOpen(false);
            setAddingAccountUser(false);
          }}
          onAddToggle={setAddingAccountUser}
          onNewUserChange={setNewAccountUser}
          onSubmit={() => {
            const name = newAccountUser.name.trim();
            const email = newAccountUser.email.trim();
            if (!name || !email) return;
            setAccountUsers(prev => [...prev, { ...newAccountUser, name, email, access: accessForAdminAccountRole(newAccountUser.role) }]);
            setNewAccountUser({ name: "", email: "", role: "Collaborator" });
            setAddingAccountUser(false);
          }}
        />
      )}

      {isMobile && (
        <>
          <MobileTabBar
            items={adminMobilePrimary}
            centerKey="projects"
            activeKey={adminNav}
            onSelect={handleAdminNavSelect}
            moreActive={moreSheetOpen || adminMobileMore.some(i => i.key === adminNav)}
            onMore={() => setMoreSheetOpen(true)}
          />
          {moreSheetOpen && (
            <MoreSheet
              title="More"
              items={adminMobileMore}
              activeKey={adminNav}
              onSelect={handleAdminNavSelect}
              onClose={() => setMoreSheetOpen(false)}
              footer={
                <AccountMenu
                  avatarLabel="T"
                  name="Trisha Baltazar"
                  subtitle="Studio owner"
                  onLogout={onLogout}
                  items={[
                    // Close the sheet on navigation too — leaving it open over
                    // the destination page would read as "stuck", not intentional.
                    { key: "settings", label: "Settings", icon: Settings, onClick: () => { setMoreSheetOpen(false); setAdminNav("settings"); } },
                    { key: "notif-settings", label: "Notification settings", icon: Bell, onClick: () => { setMoreSheetOpen(false); setAdminNav("notifications"); setNotifSettingsOpen(true); } },
                  ]}
                />
              }
            />
          )}
        </>
      )}
    </div>
  );
}
