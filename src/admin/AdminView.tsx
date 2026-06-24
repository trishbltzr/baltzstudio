import { ArrowDownCircle, ArrowUpCircle, Bell, ClipboardList, Folder, Home, LayoutDashboard, ChevronsLeft, ChevronsRight, Paperclip, Plus, Settings, User, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import type { ClientLifecycleStage, Project, TaskStatus, BrandIdentity, AdminNav, ProjectTab, ClientNav } from "../types";
import { planAccess } from "../lib/projectUtils";
import { ProgressBar, PanelHeader, Panel } from "../components/shared";
import { type MobileNavItem, MobileTabBar, MoreSheet } from "../components/mobileNav";
import { deriveAdminNotifications, NotificationBell, NotificationsPage } from "../components/notifications";
import { useIsMobile } from "../hooks/use-mobile";
import { AdminMilestonesTab, AdminPortfolioTasks, BrandGuidelinesPanel, AdminNotesTab } from "./AdminTabs";
import { ClientMilestonesTab, ClientOverviewTab } from "../client/ClientTabs";
import { ContractModal } from "../components/ContractModal";
import { AccountMenu } from "../components/legal";
import { DashboardSidebar } from "../components/DashboardSidebar";
import { FileAssetHub } from "../components/FileAssetHub";
import { FILE_WORKSPACE_TITLES } from "../components/fileWorkspace";

// ─────────────────────────────────────────────
// ADMIN — MAIN VIEW
// ─────────────────────────────────────────────

function accessForAdminAccountRole(role: string) {
  if (role === "Studio admin") return "Can manage project";
  if (role === "Studio manager") return "Can manage project work";
  if (role === "Client owner") return "Can review and approve";
  return "Can view client portal";
}

function isProjectTab(value: string | undefined): value is ProjectTab {
  return value === "overview" || value === "milestones" || value === "assets" || value === "brand-guidelines" || value === "audit" || value === "notes";
}

function isAdminTopNav(value: string | undefined): value is AdminNav {
  return value === "home" || value === "projects" || value === "reviews" || value === "assets" || value === "users" || value === "clients" || value === "settings" || value === "notifications";
}

function planTierForStage(stage: ClientLifecycleStage) {
  if (stage === "cocoon-consult") return "Basic";
  if (stage === "paid-cocoon") return "Premium";
  return null;
}

function planLabelForStage(stage: ClientLifecycleStage) {
  if (stage === "wiaw-active") return "Winged in a Week";
  if (stage === "in-full-flight") return "In Full Flight";
  if (stage === "deleted") return "Dashboard Deleted";
  return "Cocoon Consult";
}

function AdminPlanSelector({
  stage,
  onChange,
}: {
  stage: ClientLifecycleStage;
  onChange: (stage: ClientLifecycleStage) => void;
}) {
  const selectedTier = planTierForStage(stage);
  const isBasicConsult = stage === "cocoon-consult";
  const isWiaw = stage === "wiaw-active";

  return (
    <div className="admin-plan-selector">
      <span className="admin-plan-selector-label">Current plan</span>
      <div className="admin-plan-status" aria-label={`Current plan: ${planLabelForStage(stage)}${selectedTier ? ` ${selectedTier}` : ""}`}>
        <span className="admin-plan-trigger-text">{planLabelForStage(stage)}</span>
        {selectedTier && <span className={`plan-tier-badge plan-tier-badge--${selectedTier.toLowerCase()}`}>{selectedTier}</span>}
      </div>
      <div className="admin-plan-actions" aria-label="Change client plan">
        <button
          type="button"
          className="admin-plan-icon-btn"
          aria-label="Downgrade to basic Cocoon Consult"
          title="Downgrade to basic Cocoon Consult"
          disabled={isBasicConsult}
          onClick={() => onChange("cocoon-consult")}
        >
          <ArrowDownCircle size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="admin-plan-icon-btn is-upgrade"
          aria-label="Upgrade to Winged in a Week"
          title="Upgrade to Winged in a Week"
          disabled={isWiaw}
          onClick={() => onChange("wiaw-active")}
        >
          <ArrowUpCircle size={16} aria-hidden="true" />
        </button>
        </div>
    </div>
  );
}

export function AdminView({ workspaceRole = "admin", projects, selectedProjectId, onSelectProject, onTaskStatusChange, onProjectTaskStatusChange, onSendGate, onApproveGate, onDenyGate, onFinishMilestone, onBrandChange, onChangeProjectStage, onLogout, initialNav }: {
  workspaceRole?: "admin" | "manager";
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  onProjectTaskStatusChange: (projectId: string, taskId: string, status: TaskStatus) => void;
  onSendGate: (gateId: string) => void;
  onApproveGate: (gateId: string) => void;
  onDenyGate: (gateId: string) => void;
  onFinishMilestone?: (milestoneId: string) => void;
  onBrandChange: (brand: BrandIdentity) => void;
  onChangeProjectStage: (stage: ClientLifecycleStage) => void;
  onLogout: () => void;
  initialNav?: string;
}) {
  const isManager = workspaceRole === "manager";
  const [adminNav, setAdminNav] = useState<AdminNav>(() => isProjectTab(initialNav) ? "projects" : isAdminTopNav(initialNav) ? initialNav : "home");
  const [projectTab, setProjectTab] = useState<ProjectTab>(() => isProjectTab(initialNav) ? initialNav : "overview");
  const [contractOpen, setContractOpen] = useState(false);
  const project = projects.find(p => p.id === selectedProjectId) ?? projects[0]!;
  const access = planAccess(project);
  const [accountUsers, setAccountUsers] = useState(() => [
    { name: project.clientName, email: project.clientEmail, role: "Client owner", access: accessForAdminAccountRole("Client owner") },
    { name: "Trisha Baltazar", email: "studio@baltazarstudio.co", role: "Studio admin", access: accessForAdminAccountRole("Studio admin") },
  ]);
  const [addingAccountUser, setAddingAccountUser] = useState(false);
  const [newAccountUser, setNewAccountUser] = useState({ name: "", email: "", role: "Collaborator" });
  const [clientAssignments, setClientAssignments] = useState<Record<string, string>>(() =>
    Object.fromEntries(projects.map(item => [item.id, isManager ? "Studio Manager" : "Trisha Baltazar"])),
  );
  const handleAccountUserSubmit = () => {
    const name = newAccountUser.name.trim();
    const email = newAccountUser.email.trim();
    if (!name || !email) return;
    setAccountUsers(prev => [...prev, { ...newAccountUser, name, email, access: accessForAdminAccountRole(newAccountUser.role) }]);
    setNewAccountUser({ name: "", email: "", role: "Collaborator" });
    setAddingAccountUser(false);
  };
  useEffect(() => {
    setAccountUsers(prev => {
      const clientOwner = { name: project.clientName, email: project.clientEmail, role: "Client owner", access: accessForAdminAccountRole("Client owner") };
      const rest = prev.filter(user => user.role !== "Client owner");
      return [clientOwner, ...rest];
    });
  }, [project.clientEmail, project.clientName]);
  useEffect(() => {
    setClientAssignments(prev => {
      const next = { ...prev };
      for (const item of projects) {
        if (!next[item.id]) next[item.id] = isManager ? "Studio Manager" : "Trisha Baltazar";
      }
      return next;
    });
  }, [projects, isManager]);
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
    { key: "home",          label: "Overview",      icon: Home },
    { key: "projects",      label: "Projects",       icon: Folder },
    { key: "notifications", label: "Notifications",  icon: Bell, count: unread },
  ];
  const adminMobileMore: MobileNavItem[] = [
    { key: "clients",  label: "Clients",  icon: UserPlus },
    { key: "users",    label: "Config",   icon: Settings },
    { key: "assets",   label: "Files",    icon: Paperclip, locked: !access.files },
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
    if (nav === "overview") {
      setAdminNav("home");
      return;
    }
    if (nav === "project-overview") {
      setAdminNav("projects");
      setProjectTab("overview");
      return;
    }
    if (nav === "files") {
      if (!access.files) return;
      setAdminNav("assets");
      return;
    }
    if (nav === "users") {
      if (!access.users) return;
      setAdminNav("users");
      return;
    }
    if (nav === "contract") {
      if (!access.contract) return;
      setContractOpen(true);
      return;
    }
    if (nav === "milestones" || nav === "assets" || nav === "brand-guidelines" || nav === "notes") {
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
  const activeSidebarNav = contractOpen ? "contract" : adminNav === "home" ? "overview" : adminNav === "projects" ? projectTab === "overview" ? "project-overview" : projectTab : adminNav;
  const projectViewTitles: Record<ProjectTab, string> = {
    overview: "Project Overview",
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

  const adminSidebarNavSections = [
    { label: "Workspace", items: [
      { id: "overview",   label: "Launch Pad", icon: LayoutDashboard },
      { id: "notifications", label: "Notifications", icon: Bell, count: unread },
    ]},
    { label: "Manage", items: [
      { id: "clients", label: "Clients", icon: UserPlus },
      { id: "users", label: "Configurations", icon: Settings, locked: !access.users },
    ]},
  ];

  const projectNavItems = [
      { id: "project-overview", label: "Overview",      icon: LayoutDashboard },
      { id: "milestones",    label: "Milestones",    icon: ClipboardList, locked: !access.milestones },
      { id: "assets",        label: "Files",         icon: Folder, locked: !access.files },
  ];

  return (
    <div className={`client-dashboard-shell ${sidebarCollapsed ? "is-collapsed" : ""}`}>
      {!isMobile && (
        <DashboardSidebar
          activeNav={activeSidebarNav}
          onNavChange={handleAdminSidebarNavSelect}
          navSections={adminSidebarNavSections}
          collapsed={sidebarCollapsed}
          onLogout={onLogout}
          brandMark="BS"
          brandName="Baltazar Studio"
          brandSub={isManager ? "Manager workspace" : "Admin workspace"}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={(id) => {
            onSelectProject(id);
            setAdminNav("projects");
            setProjectTab("overview");
          }}
          projectNavItems={projectNavItems}
          footerAvatarLabel={isManager ? "SM" : "T"}
          footerName={isManager ? "Studio Manager" : "Trisha Baltazar"}
          footerSub={isManager ? "Studio manager" : "Studio admin"}
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
              <div className="dashboard-topbar-left">
                <div className="dashboard-topbar-heading-row">
                  <div className="dashboard-topbar-title">Launch Pad</div>
                </div>
              </div>
              {!isMobile && <NotificationBell notifications={notifications} readIds={readIds} setReadIds={setReadIds} onViewAll={() => setAdminNav("notifications")} onApproveGate={onApproveGate} onDenyGate={onDenyGate} />}
            </div>
            <div className="dashboard-main">
              <div className="launch-pad-stack">
                <div className="portfolio-project-grid">
                  {projects.map(p => {
                    const prog = { done: p.milestones.flatMap(m => m.phases.flatMap(ph => ph.tasks)).filter(t => t.status === "complete").length, total: p.milestones.flatMap(m => m.phases.flatMap(ph => ph.tasks)).length };
                    const completedMilestones = p.milestones.filter(m => m.status === "complete");
                    const milestone = p.milestones.find(m => m.status === "active") ?? p.milestones.find(m => m.status === "locked") ?? completedMilestones[completedMilestones.length - 1];
                    const milestoneLabel = milestone ? `M${milestone.number} - ${milestone.title}` : "No milestone";
                    const milestoneState = milestone ? milestone.status === "complete" ? "Complete" : milestone.status === "active" ? "Active" : "Locked" : "Not started";
                    return (
                      <Panel key={p.id} className="portfolio-project-card">
                        <button type="button" className="portfolio-project-card-button" onClick={() => { onSelectProject(p.id); setAdminNav("projects"); setProjectTab("overview"); }}>
                          <div className="portfolio-project-card-head">
                            <div className="portfolio-project-avatar">{p.clientInitials}</div>
                            <div className="portfolio-project-copy">
                              <div className="portfolio-project-name">{p.clientName}</div>
                              <div className="portfolio-project-milestone">{milestoneLabel}</div>
                            </div>
                            <span className={`portfolio-project-state is-${milestone?.status ?? "not-started"}`}>{milestoneState}</span>
                          </div>
                          <ProgressBar {...prog} />
                        </button>
                      </Panel>
                    );
                  })}
                </div>
                <AdminPortfolioTasks projects={projects} onProjectTaskStatusChange={onProjectTaskStatusChange} />
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
              <div className="dashboard-topbar-left">
                <div className="dashboard-topbar-heading-row">
                  <div className="dashboard-topbar-title">Portfolio Tasks</div>
                </div>
              </div>
              {!isMobile && <NotificationBell notifications={notifications} readIds={readIds} setReadIds={setReadIds} onViewAll={() => setAdminNav("notifications")} onApproveGate={onApproveGate} onDenyGate={onDenyGate} />}
            </div>
            <div className="dashboard-main"><AdminPortfolioTasks projects={projects} onProjectTaskStatusChange={onProjectTaskStatusChange} /></div>
          </>
        )}

        {adminNav === "assets" && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <div className="dashboard-topbar-heading-row">
                  <div className="dashboard-topbar-title">Files</div>
                </div>
              </div>
              {!isMobile && <NotificationBell notifications={notifications} readIds={readIds} setReadIds={setReadIds} onViewAll={() => setAdminNav("notifications")} onApproveGate={onApproveGate} onDenyGate={onDenyGate} />}
            </div>
            <div className="dashboard-main"><FileAssetHub project={project} role="admin" /></div>
          </>
        )}

        {adminNav === "clients" && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <div className="dashboard-topbar-heading-row">
                  <div className="dashboard-topbar-title">Clients</div>
                </div>
              </div>
              {!isMobile && <NotificationBell notifications={notifications} readIds={readIds} setReadIds={setReadIds} onViewAll={() => setAdminNav("notifications")} onApproveGate={onApproveGate} onDenyGate={onDenyGate} />}
            </div>
            <div className="dashboard-main">
              <Panel>
                <PanelHeader title="Client assignments" icon={UserPlus} />
                <div className="account-access-body">
                  {projects.map(item => {
                    const activeMilestone = item.milestones.find(milestone => milestone.status === "active") ?? item.milestones[0];
                    return (
                      <div key={item.id} className="account-user-row">
                        <span className="account-user-avatar">{item.clientInitials}</span>
                        <div className="account-user-main">
                          <strong>{item.clientName}</strong>
                          <span>{item.clientEmail}</span>
                        </div>
                        <div className="account-user-meta">
                          <select
                            className="dashboard-select"
                            value={clientAssignments[item.id] ?? "Unassigned"}
                            aria-label={`Assign ${item.clientName}`}
                            onChange={event => setClientAssignments(prev => ({ ...prev, [item.id]: event.target.value }))}
                          >
                            <option>Trisha Baltazar</option>
                            <option>Studio Manager</option>
                            <option>Unassigned</option>
                          </select>
                          <small>{item.platform} · M{activeMilestone?.number ?? 1} {activeMilestone?.clientLabel ?? "Foundation"}</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          </>
        )}

        {adminNav === "users" && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <div className="dashboard-topbar-heading-row">
                  <div className="dashboard-topbar-title">Configurations</div>
                </div>
              </div>
              {!isMobile && <NotificationBell notifications={notifications} readIds={readIds} setReadIds={setReadIds} onViewAll={() => setAdminNav("notifications")} onApproveGate={onApproveGate} onDenyGate={onDenyGate} />}
            </div>
            <div className="dashboard-main">
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <Panel>
                  <PanelHeader title={`${project.clientName} role access`} icon={User} />
                  <div className="account-access-body">
                    {accountUsers.map(person => (
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
                  <div className="users-modal-body">
                    {addingAccountUser ? (
                      <form
                        className="account-setup-form"
                        onSubmit={event => {
                          event.preventDefault();
                          handleAccountUserSubmit();
                        }}
                      >
                        <div className="account-setup-inline-fields">
                          <input value={newAccountUser.name} onChange={event => setNewAccountUser({ ...newAccountUser, name: event.target.value })} placeholder="Name" />
                          <input type="email" value={newAccountUser.email} onChange={event => setNewAccountUser({ ...newAccountUser, email: event.target.value })} placeholder="Email" />
                          <select className="dashboard-select" value={newAccountUser.role} onChange={event => setNewAccountUser({ ...newAccountUser, role: event.target.value })}>
                            <option>Collaborator</option>
                            <option>Client owner</option>
                            <option>Studio manager</option>
                            <option>Studio admin</option>
                          </select>
                        </div>
                        <div className="account-setup-actions">
                          <button type="button" className="btn" onClick={() => setAddingAccountUser(false)}>Cancel</button>
                          <button type="submit" className="btn btn-primary">Add access</button>
                        </div>
                      </form>
                    ) : (
                      <button type="button" className="users-modal-add" onClick={() => setAddingAccountUser(true)}>
                        <Plus size={13} />
                        Add role access
                      </button>
                    )}
                  </div>
                </Panel>

                <Panel>
                  <PanelHeader title="Role settings" icon={Settings} />
                  <div style={{ padding: "0.75rem 1.25rem 1rem" }}>
                    {[
                      ["Studio admin", "Can manage plans, files, milestones, roles, and notifications."],
                      ["Studio manager", "Can manage active project work and client communication."],
                      ["Client owner", "Can review deliverables, complete client tasks, and access shared files."],
                      ["Collaborator", "Can view assigned project information."],
                    ].map(([role, detail]) => (
                      <div key={role} style={{ display: "grid", gap: "0.18rem", padding: "0.75rem 0", borderBottom: "1px solid var(--border-soft)" }}>
                        <strong style={{ fontSize: "var(--text-md)", fontWeight: 500 }}>{role}</strong>
                        <span style={{ color: "var(--fg-muted)", fontSize: "var(--text-sm)", lineHeight: 1.5 }}>{detail}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          </>
        )}

        {adminNav === "settings" && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <div className="dashboard-topbar-heading-row">
                  <div className="dashboard-topbar-title">Settings</div>
                </div>
              </div>
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
              <div className="dashboard-topbar-left">
                <div className="dashboard-topbar-heading-row">
                  <div className="dashboard-topbar-title">Notifications</div>
                </div>
              </div>
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
                  avatarLabel={isManager ? "SM" : "T"}
                  name={isManager ? "Studio Manager" : "Trisha Baltazar"}
                  subtitle={isManager ? "Studio manager" : "Studio owner"}
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
