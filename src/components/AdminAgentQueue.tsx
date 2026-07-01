"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Archive, Bot, Check, ChevronDown, ChevronLeft, ChevronsLeft, ChevronsRight, CircleDashed, Clock3, CornerUpLeft, Eye, Filter, Lock, MessageSquare, MessageSquareText, Paperclip, Plus, Search, Send, Shield, User, X } from "lucide-react";

type ThreadSource = "cocoon" | "wiaw" | "in_full_flight";
type ThreadStatus = "unread" | "open" | "waiting" | "preview_ready" | "resolved" | "escalated";

type SystemNoteKind = "routing" | "scope" | "info";

type ThreadMessage = {
  id: string;
  role: "client" | "studio" | "system";
  sender: string;
  senderInitials: string;
  body: string;
  time: string;
  day?: string;
  systemKind?: SystemNoteKind;
  attachments?: string[];
};

type InboxThread = {
  id: string;
  clientName: string;
  clientInitials: string;
  subject: string;
  source: ThreadSource;
  status: ThreadStatus;
  assignee: string | null;
  updatedAt: string;
  messages: ThreadMessage[];
};

// Requests auto-route to AI; harder / out-of-scope work is reassigned to an
// agent (a human developer).
const ASSIGNEES = [
  { id: "ai", label: "AI", icon: "bot" },
  { id: "agent", label: "Agent", icon: "user" },
] as const;

const MOCK_THREADS: InboxThread[] = [
  {
    id: "thread-001",
    clientName: "House of Hazel",
    clientInitials: "HH",
    subject: "Can I see how the homepage is shaping up?",
    source: "cocoon",
    status: "unread",
    assignee: null,
    updatedAt: "Just now",
    messages: [
      { id: "m1", role: "client", sender: "Hazel", senderInitials: "HH", body: "Hi! I'd love to get a quick preview of how the homepage is shaping up before the milestone review. Is that possible at this stage?", time: "2:15 PM", day: "Today" },
    ],
  },
  {
    id: "thread-002",
    clientName: "Flora & Co.",
    clientInitials: "FC",
    subject: "Update the hero headline to something warmer",
    source: "in_full_flight",
    status: "preview_ready",
    assignee: "ai",
    updatedAt: "11:04 AM",
    messages: [
      { id: "m1", role: "client", sender: "Flora", senderInitials: "FC", body: "Can you make the hero headline warmer? Something that feels more inviting.", time: "10:58 AM", day: "Today" },
      { id: "m2", role: "system", sender: "System", senderInitials: "SY", body: "Request classified as Quick edit. Routing to support lane.", time: "10:58 AM", systemKind: "routing" },
      { id: "m3", role: "studio", sender: "In Full Flight", senderInitials: "BS", body: "This fits the post-launch support lane. I'll adjust the hero copy and prepare a preview without changing the page structure.", time: "11:01 AM" },
      { id: "m4", role: "studio", sender: "In Full Flight", senderInitials: "BS", body: "Your preview is ready. Approve it to lock this direction, or tell me what to adjust.", time: "11:04 AM" },
    ],
  },
  {
    id: "thread-003",
    clientName: "Flora & Co.",
    clientInitials: "FC",
    subject: "Add a testimonial section below the fold",
    source: "in_full_flight",
    status: "open",
    assignee: "ai",
    updatedAt: "10:55 AM",
    messages: [
      { id: "m1", role: "client", sender: "Flora", senderInitials: "FC", body: "I want to add a testimonials section right below the hero. Maybe 2-3 quotes from clients.", time: "10:48 AM", day: "Today" },
      { id: "m2", role: "system", sender: "System", senderInitials: "SY", body: "Request classified as Preview change. Generating preview.", time: "10:49 AM", systemKind: "routing" },
      { id: "m3", role: "studio", sender: "In Full Flight", senderInitials: "BS", body: "This fits your support scope. I can add an approved testimonials section and generate a preview for review. Working on it now.", time: "10:55 AM" },
    ],
  },
  {
    id: "thread-004",
    clientName: "House of Hazel",
    clientInitials: "HH",
    subject: "What's the timeline for the CMS setup?",
    source: "wiaw",
    status: "resolved",
    assignee: "agent",
    updatedAt: "Yesterday",
    messages: [
      { id: "m1", role: "client", sender: "Hazel", senderInitials: "HH", body: "Quick question — when does the CMS get set up? I want to start prepping content.", time: "3:22 PM", day: "Monday" },
      { id: "m2", role: "studio", sender: "Trisha", senderInitials: "TB", body: "Great question! The CMS goes live with Milestone 2 (Design & Build). You'll get full access once we wrap the design phase.", time: "3:45 PM" },
      { id: "m3", role: "client", sender: "Hazel", senderInitials: "HH", body: "Perfect, I'll start drafting in the meantime. Thanks!", time: "4:01 PM" },
      { id: "m4", role: "studio", sender: "Trisha", senderInitials: "TB", body: "Sounds good! I'll send you the content template ahead of time so you're ready.", time: "4:12 PM" },
      { id: "m5", role: "client", sender: "Hazel", senderInitials: "HH", body: "Amazing, thank you!", time: "4:15 PM" },
    ],
  },
  {
    id: "thread-005",
    clientName: "House of Hazel",
    clientInitials: "HH",
    subject: "Swap the product grid for a masonry layout",
    source: "in_full_flight",
    status: "escalated",
    assignee: null,
    updatedAt: "Yesterday",
    messages: [
      { id: "m1", role: "client", sender: "Hazel", senderInitials: "HH", body: "Can we change the product grid to a masonry/Pinterest-style layout? I think it would look way better.", time: "11:30 AM", day: "Tuesday" },
      { id: "m2", role: "system", sender: "Scope boundary", senderInitials: "SB", body: "This request involves structural layout changes that fall outside the post-launch support scope. A masonry grid requires template-level changes and would need a new project round.", time: "11:31 AM", systemKind: "scope" },
    ],
  },
];

function sourceLabel(source: ThreadSource) {
  if (source === "cocoon") return "Cocoon Consult";
  if (source === "wiaw") return "Winged in a Week";
  return "In Full Flight";
}

function sourceBadgeClass(source: ThreadSource) {
  if (source === "cocoon") return "is-cocoon";
  if (source === "wiaw") return "is-wiaw";
  return "is-iff";
}

function statusIcon(status: ThreadStatus) {
  if (status === "unread") return <Clock3 size={12} />;
  if (status === "open" || status === "waiting") return <CircleDashed size={12} />;
  if (status === "preview_ready" || status === "resolved") return <Check size={12} />;
  return <Lock size={12} />;
}

function statusLabel(status: ThreadStatus) {
  if (status === "unread") return "Unread";
  if (status === "open") return "Open";
  if (status === "waiting") return "Waiting";
  if (status === "preview_ready") return "Preview ready";
  if (status === "resolved") return "Resolved";
  return "Escalated";
}

function statusClass(status: ThreadStatus) {
  if (status === "preview_ready" || status === "resolved") return "is-success";
  if (status === "escalated") return "is-warn";
  if (status === "unread") return "is-incoming";
  return "is-active";
}

function statusBorderClass(status: ThreadStatus) {
  if (status === "unread") return "inbox-row-border--unread";
  if (status === "open" || status === "waiting" || status === "preview_ready") return "inbox-row-border--open";
  if (status === "resolved") return "inbox-row-border--resolved";
  if (status === "escalated") return "inbox-row-border--escalated";
  return "";
}

function threadPreview(thread: InboxThread) {
  const last = thread.messages[thread.messages.length - 1];
  if (!last) return "";
  if (last.role === "studio") return `You: ${last.body}`;
  return last.body;
}

// true when the latest non-system message is from the client — the studio owes a reply
function threadAwaiting(thread: InboxThread) {
  for (let i = thread.messages.length - 1; i >= 0; i--) {
    const role = thread.messages[i].role;
    if (role === "client") return true;
    if (role === "studio") return false;
  }
  return false;
}

function fmtNow() {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(Date.now());
}

const CANNED_REPLIES = [
  "Thanks for reaching out! I'll take a look and follow up shortly.",
  "Your preview is ready — take a look and let me know if you'd like any tweaks.",
  "That one falls a little outside the current support scope, but here's what we can do instead:",
];

export function AdminAgentQueue({ role = "admin", focusClientName }: { role?: "admin" | "manager"; focusClientName?: string } = {}) {
  // Managers work the "agent queue" — requests that need a human (routed to an
  // agent, escalated, or not yet triaged), not the ones AI auto-handles.
  const isAgentQueue = role === "manager";
  const scopedThreads = isAgentQueue
    ? MOCK_THREADS.filter(t => t.assignee !== "ai")
    : MOCK_THREADS;
  // When a client is selected in the workspace, the inbox opens focused on them
  // (with a one-tap escape to all clients) so the Room and Inbox stay in sync.
  const focusedClient = focusClientName && scopedThreads.some(t => t.clientName === focusClientName)
    ? focusClientName
    : null;
  const [threads, setThreads] = useState(scopedThreads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>(focusedClient ?? "all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [revealedTimes, setRevealedTimes] = useState<Set<string>>(new Set());
  const [reply, setReply] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<string[]>([]);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  useEffect(() => {
    setClientFilter(focusedClient ?? "all");
  }, [focusedClient]);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [cannedReplies, setCannedReplies] = useState<string[]>(CANNED_REPLIES);
  const [addingCanned, setAddingCanned] = useState(false);
  const [newCanned, setNewCanned] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const clients = [...new Set(threads.map(t => t.clientName))];
  const unreadCount = threads.filter(t => t.status === "unread").length;

  const matchStatus = (t: InboxThread) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "unread") return t.status === "unread";
    if (statusFilter === "open") return t.status === "open" || t.status === "waiting" || t.status === "preview_ready";
    return t.status === "resolved" || t.status === "escalated";
  };

  const statusCounts = {
    all: threads.length,
    unread: threads.filter(t => t.status === "unread").length,
    open: threads.filter(t => t.status === "open" || t.status === "waiting" || t.status === "preview_ready").length,
    closed: threads.filter(t => t.status === "resolved" || t.status === "escalated").length,
  };

  const filtered = threads
    .filter(t => clientFilter === "all" || t.clientName === clientFilter)
    .filter(matchStatus)
    .filter(t => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        t.subject.toLowerCase().includes(q) ||
        t.clientName.toLowerCase().includes(q) ||
        t.messages.some(m => m.body.toLowerCase().includes(q))
      );
    });

  const active = threads.find(t => t.id === activeId) ?? null;

  // Scroll the chat container itself (not scrollIntoView, which also scrolls
  // ancestors and would slide the whole page under the fixed mobile topbar).
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.id, active?.messages.length]);

  useEffect(() => {
    if (active) composerRef.current?.focus();
  }, [active?.id]);

  // Close the status menu when switching threads
  useEffect(() => {
    setStatusMenuOpen(false);
    setCannedOpen(false);
    setAddingCanned(false);
    setPendingAttachments([]);
  }, [active?.id]);

  // Dismiss the status menu on outside click
  useEffect(() => {
    if (!statusMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!statusMenuRef.current?.contains(e.target as Node)) setStatusMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [statusMenuOpen]);

  function selectThread(id: string) {
    setThreads(prev =>
      prev.map(t => t.id === id && t.status === "unread" ? { ...t, status: "open" as const } : t),
    );
    setActiveId(id);
    setReply("");
    setPendingAttachments([]);
  }

  function assignThread(threadId: string, assigneeId: string) {
    setThreads(prev =>
      prev.map(t =>
        t.id === threadId
          ? { ...t, assignee: assigneeId, status: t.status === "unread" ? "open" as const : t.status }
          : t,
      ),
    );
  }

  function archiveThread(threadId: string) {
    setThreads(prev => prev.filter(t => t.id !== threadId));
    setActiveId(current => current === threadId ? null : current);
    setReply("");
    setPendingAttachments([]);
  }

  function setThreadStatus(threadId: string, status: ThreadStatus) {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, status } : t));
    setStatusMenuOpen(false);
  }

  function approvePreview(threadId: string) {
    setThreads(prev => prev.map(t => t.id === threadId
      ? {
          ...t,
          status: "resolved" as const,
          updatedAt: "Just now",
          messages: [...t.messages, {
            id: `m-${Date.now()}`,
            role: "system" as const,
            sender: "System",
            senderInitials: "SY",
            body: "Preview approved — this direction is now locked and live.",
            time: fmtNow(),
            systemKind: "info" as const,
          }],
        }
      : t));
  }

  function requestChanges() {
    setReply(prev => prev || "A couple of tweaks before we lock this in: ");
    composerRef.current?.focus();
  }

  function insertCanned(text: string) {
    setReply(text);
    setCannedOpen(false);
    setAddingCanned(false);
    composerRef.current?.focus();
  }

  function addCannedReply() {
    const value = newCanned.trim();
    if (!value) return;
    setCannedReplies(prev => [...prev, value]);
    setNewCanned("");
    setAddingCanned(false);
  }

  function removeCannedReply(text: string) {
    setCannedReplies(prev => prev.filter(c => c !== text));
  }

  function onAttach(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).map(file => file.name);
    if (files.length) {
      setPendingAttachments(prev => [...prev, ...files]);
    }
    e.target.value = "";
    composerRef.current?.focus();
  }

  function removeAttachment(name: string) {
    setPendingAttachments(prev => prev.filter(fileName => fileName !== name));
  }

  function toggleTime(messageId: string) {
    setRevealedTimes(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  function sendReply() {
    if (!active || (!reply.trim() && pendingAttachments.length === 0)) return;
    const msg: ThreadMessage = {
      id: `m-${Date.now()}`,
      role: "studio",
      sender: "Trisha",
      senderInitials: "TB",
      body: reply.trim() || "Attached file.",
      time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(Date.now()),
      attachments: pendingAttachments,
    };
    setThreads(prev =>
      prev.map(t =>
        t.id === active.id
          ? { ...t, messages: [...t.messages, msg], updatedAt: "Just now" }
          : t,
      ),
    );
    setReply("");
    setPendingAttachments([]);
  }

  const hasActiveFilters = statusFilter !== "all" || clientFilter !== "all";

  return (
    <div className="inbox-shell">
    <section className={`inbox-split ${listCollapsed ? "is-list-collapsed" : ""} ${active ? "has-active" : ""}`}>
      {/* ── Left ── */}
      <div className="inbox-list-pane">
        <div className="inbox-list-header">
          <strong className="inbox-list-title">
            {isAgentQueue ? "Agent queue" : "Conversations"}
            {unreadCount > 0 && <span className="inbox-unread-badge">{unreadCount}</span>}
          </strong>
          <div className="inbox-list-actions">
            <button
              type="button"
              className={`inbox-filter-toggle ${showFilters || hasActiveFilters ? "is-active" : ""}`}
              onClick={() => setShowFilters(p => !p)}
              aria-label="Toggle filters"
            >
              <Filter size={14} />
            </button>
            <button
              type="button"
              className="inbox-list-toggle"
              onClick={() => setListCollapsed(p => !p)}
              aria-label={listCollapsed ? "Expand conversations" : "Collapse conversations"}
              aria-expanded={!listCollapsed}
            >
              {listCollapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
            </button>
          </div>
        </div>

        {!listCollapsed && (
          <div className="inbox-search">
            <Search size={13} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
            />
          </div>
        )}

        {showFilters && !listCollapsed && (
          <div className="inbox-filter-bar">
            <div className="inbox-filter-group">
              <label className="inbox-filter-label">Status</label>
              <select className="dashboard-select inbox-filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="all">All ({statusCounts.all})</option>
                <option value="unread">Unread ({statusCounts.unread})</option>
                <option value="open">Open ({statusCounts.open})</option>
                <option value="resolved">Closed ({statusCounts.closed})</option>
              </select>
            </div>
            {clients.length > 1 && (
              <div className="inbox-filter-group">
                <label className="inbox-filter-label">Client</label>
                <select className="dashboard-select inbox-filter-select" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
                  <option value="all">All clients</option>
                  {clients.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {!listCollapsed && focusedClient && clientFilter === focusedClient && (
          <button
            type="button"
            className="inbox-focus-chip"
            onClick={() => setClientFilter("all")}
          >
            <span className="inbox-focus-chip-label">Focused on <strong>{focusedClient}</strong></span>
            <span className="inbox-focus-chip-action">View all clients</span>
          </button>
        )}

        <div className="inbox-list-scroll">
          {filtered.length === 0 && (
            <div className="inbox-empty"><span>No conversations.</span></div>
          )}
          {filtered.map(thread => (
            <button
              key={thread.id}
              type="button"
              className={`inbox-row ${thread.status === "unread" ? "is-unread" : ""} ${activeId === thread.id ? "is-selected" : ""}`}
              onClick={() => selectThread(thread.id)}
              aria-label={`${thread.clientName}: ${thread.subject}`}
            >
              <div className={`inbox-row-indicator ${statusBorderClass(thread.status)}`} />
              <div className="inbox-row-avatar">{thread.clientInitials}</div>
              <div className="inbox-row-body">
                <div className="inbox-row-top">
                  <span className="inbox-row-client">{thread.clientName}</span>
                  <span className="inbox-row-time">{thread.updatedAt}</span>
                </div>
                <strong className="inbox-row-subject">{thread.subject}</strong>
                <p className="inbox-row-snippet">{threadPreview(thread)}</p>
                <div className="inbox-row-tags">
                  <span className={`inbox-chip ${sourceBadgeClass(thread.source)}`}>{sourceLabel(thread.source)}</span>
                  <span className={`inbox-row-status ${statusClass(thread.status)}`}>
                    {statusIcon(thread.status)}
                    {statusLabel(thread.status)}
                  </span>
                  {threadAwaiting(thread) && thread.status !== "resolved" && (
                    <span className="inbox-row-awaiting">Awaiting reply</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right ── */}
      <div className="inbox-detail-pane">
        {active ? (
          <>
            <div className="inbox-detail-top">
              <div className="inbox-detail-who">
                <button
                  type="button"
                  className="inbox-detail-back"
                  onClick={() => { setActiveId(null); setReply(""); }}
                  aria-label="Back to conversations"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="inbox-detail-avatar">{active.clientInitials}</div>
                <div className="inbox-detail-subject-block">
                  <strong>{active.subject}</strong>
                  <div className="inbox-detail-meta">
                    <span className={`inbox-source ${sourceBadgeClass(active.source)}`}>{sourceLabel(active.source)}</span>
                    <span>{active.clientName}</span>
                  </div>
                </div>
              </div>
              <div className="inbox-status-wrap" ref={statusMenuRef}>
                <button
                  type="button"
                  className={`inbox-status is-button ${statusClass(active.status)}`}
                  onClick={() => setStatusMenuOpen(o => !o)}
                  aria-haspopup="menu"
                  aria-expanded={statusMenuOpen}
                >
                  {statusIcon(active.status)}
                  {statusLabel(active.status)}
                  <ChevronDown size={11} />
                </button>
                {statusMenuOpen && (
                  <div className="inbox-status-menu" role="menu">
                    <button type="button" role="menuitem" onClick={() => setThreadStatus(active.id, "open")}>
                      <CircleDashed size={12} />Mark as open
                    </button>
                    <button type="button" role="menuitem" onClick={() => setThreadStatus(active.id, "resolved")}>
                      <Check size={12} />Mark resolved
                    </button>
                    <button type="button" role="menuitem" onClick={() => setThreadStatus(active.id, "escalated")}>
                      <Lock size={12} />Escalate
                    </button>
                    <div className="inbox-status-menu-divider" />
                    <button type="button" role="menuitem" className="is-archive" onClick={() => archiveThread(active.id)}>
                      <Archive size={12} />Archive
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="inbox-chat" ref={chatRef}>
              {active.messages.map((msg, i) => {
                const prev = active.messages[i - 1];
                const next = active.messages[i + 1];
                const showDay = msg.day && (!prev || prev.day !== msg.day);
                const sameAsPrev = prev && prev.role === msg.role && prev.sender === msg.sender && msg.role !== "system";
                const sameAsNext = next && next.role === msg.role && next.sender === msg.sender && msg.role !== "system";

                return (
                  <div key={msg.id}>
                    {showDay && (
                      <div className="inbox-day-divider">
                        <span>{msg.day}</span>
                      </div>
                    )}

                    {msg.role === "system" ? (
                      <div className={`inbox-system-card ${msg.systemKind === "scope" ? "is-scope" : "is-routing"}`}>
                        <div className="inbox-system-card-icon">
                          {msg.systemKind === "scope" ? <Shield size={13} /> : <CircleDashed size={13} />}
                        </div>
                        <div className="inbox-system-card-body">
                          <strong>{msg.sender}</strong>
                          <p>{msg.body}</p>
                        </div>
                      </div>
                    ) : (
                      <div className={`inbox-bubble-row inbox-bubble-row--${msg.role} ${sameAsPrev ? "is-grouped" : ""}`}>
                        {!sameAsPrev ? (
                          <div className={`inbox-bubble-av ${msg.role === "client" ? "is-client" : "is-studio"}`}>
                            {msg.senderInitials}
                          </div>
                        ) : (
                          <div className="inbox-bubble-av-spacer" />
                        )}
                        <div className="inbox-bubble-wrap">
                          <div
                            className={`inbox-bubble inbox-bubble--${msg.role}`}
                            onClick={() => toggleTime(msg.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={event => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                toggleTime(msg.id);
                              }
                            }}
                          >
                            <p>{msg.body}</p>
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="inbox-attachment-list" aria-label="Attachments">
                                {msg.attachments.map(fileName => (
                                  <span key={fileName} className="inbox-attachment-chip">
                                    <Paperclip size={12} />
                                    {fileName}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {!sameAsNext && (
                            <div className={`inbox-bubble-footer inbox-bubble-footer--${msg.role}`}>
                              {revealedTimes.has(msg.id) && (
                                <span className="inbox-bubble-time-toggle is-active">
                                  {msg.day ? `${msg.day} · ` : ""}{msg.time}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="inbox-detail-footer">
              {active.status === "preview_ready" && (
                <div className="inbox-preview-bar">
                  <div className="inbox-preview-text">
                    <Eye size={13} />
                    <span>Preview ready for {active.clientName}</span>
                  </div>
                  <div className="inbox-preview-actions">
                    <button type="button" className="inbox-preview-approve" onClick={() => approvePreview(active.id)}>
                      <Check size={12} />Approve
                    </button>
                    <button type="button" className="inbox-preview-adjust" onClick={requestChanges}>
                      <CornerUpLeft size={12} />Request changes
                    </button>
                  </div>
                </div>
              )}
              <form className="inbox-reply" onSubmit={e => { e.preventDefault(); sendReply(); }}>
                <textarea
                  ref={composerRef}
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder={`Reply to ${active.clientName}...`}
                  rows={1}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendReply();
                    }
                  }}
                />
                {pendingAttachments.length > 0 && (
                  <div className="inbox-pending-attachments" aria-label="Files ready to send">
                    {pendingAttachments.map(fileName => (
                      <span key={fileName} className="inbox-pending-attachment">
                        <Paperclip size={12} />
                        {fileName}
                        <button type="button" onClick={() => removeAttachment(fileName)} aria-label={`Remove ${fileName}`}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="inbox-reply-bar">
                  <div className="inbox-reply-tools">
                    <button type="button" className="inbox-compose-tool" onClick={() => fileRef.current?.click()} aria-label="Attach file">
                      <Paperclip size={15} />
                    </button>
                    <div className="inbox-canned-wrap">
                      <button
                        type="button"
                        className={`inbox-compose-tool ${cannedOpen ? "is-active" : ""}`}
                        onClick={() => setCannedOpen(o => !o)}
                        aria-label="Quick replies"
                        aria-expanded={cannedOpen}
                      >
                        <MessageSquareText size={15} />
                      </button>
                      {cannedOpen && (
                        <div className="inbox-canned-menu" role="menu">
                          <div className="inbox-canned-head">
                            <span className="inbox-canned-title">Quick replies</span>
                            {!addingCanned && (
                              <button
                                type="button"
                                className="inbox-canned-new"
                                onClick={() => setAddingCanned(true)}
                              >
                                <Plus size={13} />New
                              </button>
                            )}
                          </div>

                          <div className="inbox-canned-list">
                            {cannedReplies.map((c, i) => (
                              <div key={i} className="inbox-canned-item">
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="inbox-canned-item-text"
                                  onClick={() => insertCanned(c)}
                                >
                                  {c}
                                </button>
                                <button
                                  type="button"
                                  className="inbox-canned-item-remove"
                                  onClick={() => removeCannedReply(c)}
                                  aria-label="Remove quick reply"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                            {cannedReplies.length === 0 && !addingCanned && (
                              <p className="inbox-canned-empty">No quick replies yet — add one.</p>
                            )}
                          </div>

                          {addingCanned && (
                            <div className="inbox-canned-add">
                              <textarea
                                value={newCanned}
                                onChange={e => setNewCanned(e.target.value)}
                                placeholder="Write a reusable reply…"
                                rows={2}
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    addCannedReply();
                                  }
                                  if (e.key === "Escape") {
                                    setAddingCanned(false);
                                    setNewCanned("");
                                  }
                                }}
                              />
                              <div className="inbox-canned-add-actions">
                                <button
                                  type="button"
                                  className="inbox-canned-cancel"
                                  onClick={() => { setAddingCanned(false); setNewCanned(""); }}
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  className="inbox-canned-save"
                                  onClick={addCannedReply}
                                  disabled={!newCanned.trim()}
                                >
                                  Add reply
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button type="submit" className="inbox-send-btn" disabled={!reply.trim() && pendingAttachments.length === 0} aria-label="Send">
                    <Send size={14} />
                  </button>
                </div>
                <input ref={fileRef} type="file" hidden multiple onChange={onAttach} />
              </form>
              <div className="inbox-thread-actions">
                <div className="inbox-routing-row">
                  <span className="inbox-routing-label">Routing</span>
                  <div className="inbox-routing-inline">
                    {ASSIGNEES.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        className={`inbox-routing-btn ${active.assignee === a.id ? "is-active" : ""}`}
                        onClick={() => assignThread(active.id, a.id)}
                      >
                        {a.icon === "bot" ? <Bot size={11} /> : <User size={11} />}
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="inbox-detail-empty">
            <MessageSquare size={22} />
            <p>Select a conversation</p>
          </div>
        )}
      </div>
    </section>
    </div>
  );
}
