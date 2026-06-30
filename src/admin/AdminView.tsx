import dynamic from "next/dynamic";
import { ArrowDownCircle, ArrowUpCircle, Bell, Bot, CheckCircle2, ChevronDown, Flag, Folder, Home, Inbox, LayoutDashboard, ChevronsLeft, ChevronsRight, Plus, Settings, User, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { ClientLifecycleStage, Project, TaskStatus, BrandIdentity, AdminNav, ProjectTab, ClientNav } from "../types";
import { planAccess } from "../lib/projectUtils";
import { can } from "../lib/rolePermissions";
import { ProgressBar, PanelHeader, Panel } from "../components/shared";
import { type MobileNavCenterAction, type MobileNavItem, type ClientSwitcherOption, MobileTabBar, ClientSwitcherSheet } from "../components/mobileNav";
import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationSettingsPanel, type NotificationPreferences, deriveAdminNotifications, NotificationBell } from "../components/notifications";
import { useIsMobile } from "../hooks/use-mobile";
import { AccountMenu } from "../components/legal";
import { DashboardSidebar } from "../components/DashboardSidebar";
import { AdminAgentQueue } from "../components/AdminAgentQueue";
import { FILE_WORKSPACE_TITLES } from "../components/fileWorkspace";
import type { FileHubSectionId } from "../components/FileAssetHub";

function DashboardPanelLoading() {
  return (
    <div className="dashboard-main-loading" role="status" aria-live="polite">
      <span className="dashboard-preloader-dot" aria-hidden="true" />
      <span>Loading workspace...</span>
    </div>
  );
}

const AdminMilestonesTab = dynamic(() => import("./AdminTabs").then(mod => mod.AdminMilestonesTab), { loading: DashboardPanelLoading });
const AdminPortfolioTasks = dynamic(() => import("./AdminTabs").then(mod => mod.AdminPortfolioTasks), { loading: DashboardPanelLoading });
const AdminNotesTab = dynamic(() => import("./AdminTabs").then(mod => mod.AdminNotesTab), { loading: DashboardPanelLoading });
const ClientMilestonesTab = dynamic(() => import("../client/ClientTabs").then(mod => mod.ClientMilestonesTab), { loading: DashboardPanelLoading });
const ClientOverviewTab = dynamic(() => import("../client/ClientTabs").then(mod => mod.ClientOverviewTab), { loading: DashboardPanelLoading });
const ContractModal = dynamic(() => import("../components/ContractModal").then(mod => mod.ContractModal), { loading: DashboardPanelLoading });
const FileAssetHub = dynamic(() => import("../components/FileAssetHub").then(mod => mod.FileAssetHub), { loading: DashboardPanelLoading });
const NotificationsPage = dynamic(() => import("../components/notifications").then(mod => mod.NotificationsPage), { loading: DashboardPanelLoading });

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
  return value === "home" || value === "projects" || value === "reviews" || value === "assets" || value === "clients" || value === "inbox" || value === "settings" || value === "notifications";
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

function AdminWorkspacePane({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <div className="dashboard-topbar">
        <div className="dashboard-topbar-left">
          <div className="dashboard-topbar-heading-row">
            <div className="dashboard-topbar-title">{title}</div>
          </div>
        </div>
        {actions}
      </div>
      <div className="dashboard-main">{children}</div>
    </>
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
  const canManageClientAssignments = can(workspaceRole, "manageClientAssignments");
  const canChangeClientPlan = can(workspaceRole, "changeClientPlan");
  const canEditGlobalConfigurations = can(workspaceRole, "editGlobalConfigurations");
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const adminFileHubFocus: FileHubSectionId | undefined = projectTab === "brand-guidelines" ? "brand-guidelines" : adminNav === "assets" || projectTab === "assets" ? "assets" : undefined;
  const [settingsTab, setSettingsTab] = useState<"general" | "clients" | "notifications">("general");
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const toggleNotificationPref = (key: keyof NotificationPreferences) => {
    setNotificationPrefs(current => ({ ...current, [key]: !current[key] }));
  };
  const openAdminSettings = (tab: "general" | "clients" | "notifications" = "general") => {
    if (!canEditGlobalConfigurations) return;
    setSettingsTab(tab);
    setAdminNav("settings");
  };

  // ── Mobile bottom-nav (replaces the sidebar at ≤768px) ──
  const isMobile = useIsMobile();
  const [clientSwitcherOpen, setClientSwitcherOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  useEffect(() => {
    const handleAssistantState = (event: Event) => {
      const detail = (event as CustomEvent<{ isOpen?: boolean }>).detail;
      setAssistantOpen(Boolean(detail?.isOpen));
    };

    window.addEventListener("iff-widget:state", handleAssistantState);
    return () => window.removeEventListener("iff-widget:state", handleAssistantState);
  }, []);
  const toggleInFullFlightAssistant = () => {
    window.dispatchEvent(new CustomEvent("iff-widget:toggle"));
  };
  const desktopNotificationBell = !isMobile
    ? <NotificationBell notifications={notifications} readIds={readIds} setReadIds={setReadIds} onViewAll={() => setAdminNav("notifications")} onApproveGate={onApproveGate} onDenyGate={onDenyGate} />
    : null;
  const defaultTopbarActions = desktopNotificationBell ? (
    <div className="dashboard-topbar-actions">
      {desktopNotificationBell}
    </div>
  ) : null;
  // 4 primary slots (+ "More" appended by MobileTabBar = 5 total).
  // The center slot is the raised AI action, matching the client mobile shell.
  const adminMobilePrimary: MobileNavItem[] = [
    { key: "home",          label: "Home",           icon: LayoutDashboard },
    { key: "notifications", label: "Notifications",  icon: Bell, count: unread },
    { key: "assistant",     label: assistantOpen ? "Close In Full Flight" : "In Full Flight", icon: Plus, action: toggleInFullFlightAssistant, toggled: assistantOpen },
    ...(access.tasks ? [{ key: "reviews", label: "Tasks", icon: CheckCircle2 }] : [{ key: "inbox", label: "Inbox", icon: Inbox }]),
  ];
  const adminMobileCenterActions: MobileNavCenterAction[] = [
    { key: "project-overview", label: "Overview", icon: Home, action: () => { setAdminNav("projects"); setProjectTab("overview"); } },
    { key: "milestones", label: "Milestones", icon: Flag, action: () => { if (!access.milestones) return; setAdminNav("projects"); setProjectTab("milestones"); }, locked: !access.milestones },
    { key: "files", label: "Files", icon: Folder, action: () => setAdminNav("assets"), locked: !access.files },
  ];
  const canOpenAdminNav = (nav: AdminNav) => {
    if (nav === "reviews") return access.tasks;
    if (nav === "assets") return access.assets;
    if (nav === "settings") return canEditGlobalConfigurations;
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
  const handleAdminMobileNavSelect = (key: string) => {
    if (key === "milestones") {
      handleAdminSidebarNavSelect("milestones");
      return;
    }
    handleAdminNavSelect(key);
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
      if (!access.users || !canEditGlobalConfigurations) return;
      openAdminSettings("clients");
      return;
    }
    if (nav === "clients") {
      if (!canManageClientAssignments || !canEditGlobalConfigurations) return;
      openAdminSettings("clients");
      return;
    }
    if (nav === "settings") {
      openAdminSettings("general");
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
  useEffect(() => {
    if (adminNav === "settings" && !canEditGlobalConfigurations) {
      setAdminNav("home");
    }
  }, [adminNav, canEditGlobalConfigurations]);
  const activeSidebarNav = contractOpen
    ? "contract"
    : adminNav === "home"
      ? "overview"
      : adminNav === "projects"
        ? projectTab === "overview"
          ? "project-overview"
          : projectTab === "brand-guidelines"
            ? "assets"
            : projectTab
        : adminNav;
  const projectViewTitles: Record<ProjectTab, string> = {
    overview: "Project Overview",
    milestones: "Milestones",
    ...FILE_WORKSPACE_TITLES,
    audit: "Audit",
    notes: "Notes",
  };
  const mobilePlanStage = project.workflow?.stage ?? "wiaw-active";
  const mobilePlanLabel = project.workflow?.planLabel ?? project.plan?.name ?? planLabelForStage(mobilePlanStage);
  // Rows for the mobile client switcher sheet — mirrors the launch-pad cards'
  // milestone/progress derivation so the two stay consistent.
  const clientSwitcherItems: ClientSwitcherOption[] = projects.map(p => {
    const tasks = p.milestones.flatMap(m => m.phases.flatMap(ph => ph.tasks));
    const done = tasks.filter(t => t.status === "complete").length;
    const completedMilestones = p.milestones.filter(m => m.status === "complete");
    const milestone = p.milestones.find(m => m.status === "active")
      ?? p.milestones.find(m => m.status === "locked")
      ?? completedMilestones[completedMilestones.length - 1];
    const milestoneLabel = milestone ? `M${milestone.number} ${milestone.title}` : "No milestone";
    const milestoneState = milestone
      ? milestone.status === "complete" ? "Complete" : milestone.status === "active" ? "Active" : "Locked"
      : "Not started";
    return {
      id: p.id,
      initials: p.clientInitials,
      name: p.clientName,
      sub: `${p.platform} · ${milestoneLabel} · ${milestoneState}`,
      badge: `${done}/${tasks.length}`,
    };
  });
  const handleClientSwitcherSelect = (id: string) => {
    onSelectProject(id);
    setAdminNav("projects");
    setProjectTab("overview");
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
      ...(access.tasks ? [{ id: "reviews", label: "Tasks", icon: CheckCircle2 }] : []),
      { id: "inbox", label: "Inbox", icon: Inbox },
    ]},
  ].filter(section => section.items.length > 0);
  const adminSettingsTabs: Array<{ key: "general" | "clients" | "notifications"; label: string; icon: typeof Settings }> = [
    { key: "general", label: "General", icon: Settings },
    ...(canManageClientAssignments ? [{ key: "clients" as const, label: "Clients", icon: Users }] : []),
    { key: "notifications", label: "Notifications", icon: Bell },
  ];

  const projectNavItems = [
      { id: "project-overview", label: "Overview",      icon: Home },
      { id: "milestones",    label: "Milestones",    icon: Flag, locked: !access.milestones },
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
            ...(canEditGlobalConfigurations ? [{ key: "settings", label: "Settings", icon: Settings, onClick: () => openAdminSettings("general") }] : []),
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
          <AdminWorkspacePane title="Launch Pad" actions={defaultTopbarActions}>
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
              <AdminPortfolioTasks projects={projects} role={isManager ? "manager" : "admin"} onProjectTaskStatusChange={onProjectTaskStatusChange} />
            </div>
          </AdminWorkspacePane>
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
                {canChangeClientPlan && <AdminPlanSelector stage={project.workflow?.stage ?? "wiaw-active"} onChange={onChangeProjectStage} />}
                {desktopNotificationBell}
              </div>
            </div>
            <div className="dashboard-main">
              {projectTab === "overview" && <ClientOverviewTab project={project} role="admin" onNavChange={handleAdminOverviewNav} />}
              {projectTab === "milestones" && (
                access.showAuditMilestones
                  ? <ClientMilestonesTab project={project} auditMode onTaskStatusChange={onTaskStatusChange} onFinishMilestone={onFinishMilestone} />
                  : <AdminMilestonesTab project={project} onTaskStatusChange={onTaskStatusChange} onSendGate={onSendGate} onApproveGate={onApproveGate} onFinishMilestone={onFinishMilestone} />
              )}
              {(projectTab === "assets" || projectTab === "brand-guidelines") && (
                <FileAssetHub project={project} role="admin" focusSection={adminFileHubFocus} />
              )}
              {projectTab === "notes" && <AdminNotesTab project={project} />}
            </div>
          </>
        )}

        {adminNav === "reviews" && (
          <AdminWorkspacePane title="Tasks" actions={defaultTopbarActions}>
            <AdminPortfolioTasks projects={projects} role={isManager ? "manager" : "admin"} onProjectTaskStatusChange={onProjectTaskStatusChange} />
          </AdminWorkspacePane>
        )}

        {adminNav === "assets" && (
          <AdminWorkspacePane title="Files" actions={defaultTopbarActions}>
            <FileAssetHub project={project} role="admin" focusSection={adminFileHubFocus} />
          </AdminWorkspacePane>
        )}

        {adminNav === "inbox" && (
          <AdminWorkspacePane title="Inbox" actions={defaultTopbarActions}>
            <AdminAgentQueue />
          </AdminWorkspacePane>
        )}

        {adminNav === "settings" && (
          <>
            <div className="dashboard-topbar">
              <div className="dashboard-topbar-left">
                <div className="dashboard-topbar-heading-row">
                  <div className="dashboard-topbar-title">Settings</div>
                </div>
              </div>
              {defaultTopbarActions}
            </div>
            <div className="dashboard-tabbar settings-tabbar">
              {adminSettingsTabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.key} type="button" className={`dashboard-tab ${settingsTab === tab.key ? "is-active" : ""}`} onClick={() => setSettingsTab(tab.key)}>
                    <Icon size={12} />{tab.label}
                  </button>
                );
              })}
            </div>
            <div className="dashboard-main">
              {settingsTab === "general" && (
                <Panel>
                  <PanelHeader title="Agency settings" icon={Settings} />
                  <div style={{ padding: "0.75rem 1.25rem 1rem" }}>
                    {[["Agency name", "Baltazar Studio"], ["Owner", "Trisha Baltazar"], ["Client portal", "baltazarstudio.co/portal"], ["Workspace notifications", "On"]].map(([label, value]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "0.7rem 0", borderBottom: "1px solid oklch(0.925 0.026 45 / 0.4)", fontSize: "var(--text-md)" }}>
                        <span style={{ color: "var(--fg-muted)" }}>{label}</span>
                        <span style={{ fontWeight: 500 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {settingsTab === "clients" && canManageClientAssignments && (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <Panel>
                    <PanelHeader title="Client assignments" icon={Users} />
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
              )}

              {settingsTab === "notifications" && (
                <NotificationSettingsPanel prefs={notificationPrefs} onToggle={toggleNotificationPref} />
              )}
            </div>
          </>
        )}

        {adminNav === "notifications" && (
          <AdminWorkspacePane title="Notifications" actions={defaultTopbarActions}>
            <NotificationsPage
              notifications={notifications}
              readIds={readIds} setReadIds={setReadIds}
              dismissedIds={dismissedIds} setDismissedIds={setDismissedIds}
              onNavigate={() => { setAdminNav("projects"); setProjectTab("overview"); }}
              showSettingsShortcut={false}
            />
          </AdminWorkspacePane>
        )}
        {isMobile && (
          <div className="dashboard-mobile-topbar-account">
            <AccountMenu
              avatarLabel={isManager ? "SM" : "T"}
              name={isManager ? "Studio Manager" : "Trisha Baltazar"}
              subtitle={isManager ? "Studio manager" : "Studio owner"}
              onLogout={onLogout}
              collapsed
              placement="bottom"
              items={[
                ...(access.tasks ? [{ key: "reviews", label: isManager ? "My Tasks" : "Tasks", icon: CheckCircle2, onClick: () => setAdminNav("reviews") }] : []),
                ...(canEditGlobalConfigurations ? [{ key: "settings", label: "Settings", icon: Settings, onClick: () => openAdminSettings("general") }] : []),
              ]}
            />
          </div>
        )}
        {isMobile && (
          <div className="dashboard-mobile-switcher-strip" aria-label="Workspace context">
            <button
              type="button"
              className="dashboard-mobile-client-switcher"
              onClick={() => setClientSwitcherOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={clientSwitcherOpen}
              aria-label={`Viewing ${project.clientName}. Switch client`}
            >
              <span className="dashboard-mobile-client-avatar" aria-hidden="true">{project.clientInitials}</span>
              <span className="dashboard-mobile-client-meta">
                <span className="dashboard-mobile-client-name">{project.clientName}</span>
                <span className="dashboard-mobile-client-sub">{project.platform} · {mobilePlanLabel}</span>
              </span>
              <ChevronDown size={16} aria-hidden="true" className="dashboard-mobile-client-chevron" />
            </button>
          </div>
        )}
      </section>

      {contractOpen && (
        <ContractModal project={project} onClose={() => setContractOpen(false)} />
      )}

      {isMobile && (
        <>
          <MobileTabBar
            items={adminMobilePrimary}
            centerKey="assistant"
            activeKey={adminNav === "projects" && projectTab === "milestones" ? "milestones" : adminNav}
            onSelect={handleAdminMobileNavSelect}
            centerActions={adminMobileCenterActions}
            endItem={access.tasks
              ? { key: "inbox", label: "Inbox", icon: Inbox }
              : { key: "milestones", label: "Milestones", icon: Flag, locked: !access.milestones }}
          />
          {clientSwitcherOpen && (
            <ClientSwitcherSheet
              clients={clientSwitcherItems}
              activeId={project.id}
              onSelect={handleClientSwitcherSelect}
              onClose={() => setClientSwitcherOpen(false)}
              footer={canChangeClientPlan ? (
                <div className="dashboard-client-switcher-plan">
                  <div className="dashboard-client-switcher-plan-label">
                    <span>Plan</span>
                    <strong>{mobilePlanLabel}</strong>
                  </div>
                  <div className="dashboard-mobile-plan-actions" aria-label="Change client plan">
                    <button
                      type="button"
                      aria-label="Downgrade to basic Cocoon Consult"
                      disabled={mobilePlanStage === "cocoon-consult"}
                      onClick={() => onChangeProjectStage("cocoon-consult")}
                    >
                      <ArrowDownCircle size={16} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Upgrade to Winged in a Week"
                      disabled={mobilePlanStage === "wiaw-active"}
                      onClick={() => onChangeProjectStage("wiaw-active")}
                    >
                      <ArrowUpCircle size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : undefined}
            />
          )}
        </>
      )}
    </div>
  );
}
