"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { css } from "../helpers";
import { Icon } from "../icons";
import { AdminProgressBody, ManagerProgressBody, AdminStats, AdminPipeline, ManagerStats, ManagerPipeline } from "./ProgressDeliverySections";
import { ClientProgressBody, ClientStats, ClientPipeline } from "./ClientProgressBody";
import { TaskCalendar } from "./Tasks";
import { roleTasks } from "../selectors";
import type { PortalActions, PortalState } from "../store";
import type { ProgressChatMessage, ProgressChatSession, Role } from "../types";

// Consolidated Progress hub with greeting, command input, and role-specific snapshots.

// ── header band — greeting · ask/search · the real snapshot cards ──────────────
const HERO: Record<Role, { name: string; sub: string; ph: string }> = {
  client: { name: "Client", sub: "Your workspace is ready for project details.", ph: "Ask the studio or search your workspace…" },
  dev: { name: "Kier", sub: "Your active projects and what needs your attention today.", ph: "Ask, search, or jump to a client…" },
  admin: { name: "Trish", sub: "How the studio’s doing, and what needs attention today.", ph: "Ask, search, or jump to a client…" },
};

// Pick a leading glyph for a starter question so each prompt reads at a glance.
function suggestionIcon(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("audit") || t.includes("risk")) return "shield";
  if (t.includes("approval")) return "checklist";
  if (t.includes("nudge") || t.includes("client") || t.includes("blocked")) return "users";
  if (t.includes("chang")) return "history";
  if (t.includes("plan")) return "funnel";
  if (t.includes("fix") || t.includes("attention") || t.includes("next") || t.includes("need")) return "target";
  return "sparkle";
}

function sessionDateLabel(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Now";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function chatInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2] != null) {
      nodes.push(<strong key={`${keyPrefix}-strong-${index}`} style={{ fontWeight: 500 }}>{match[2]}</strong>);
    } else if (match[3] != null) {
      nodes.push(<code key={`${keyPrefix}-code-${index}`} style={css("font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.84em;background:color-mix(in srgb,var(--fg) 7%,transparent 93%);padding:0.08rem 0.3rem;border-radius:0.3rem")}>{match[3]}</code>);
    } else {
      const href = /^(https?:\/\/|mailto:)/i.test(match[5]) ? match[5] : undefined;
      nodes.push(href
        ? <a key={`${keyPrefix}-link-${index}`} href={href} target="_blank" rel="noreferrer" style={css("color:var(--accent);text-decoration:underline;text-underline-offset:0.14em")}>{match[4]}</a>
        : <span key={`${keyPrefix}-link-${index}`}>{match[4]}</span>);
    }
    lastIndex = match.index + match[0].length;
    index += 1;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function ChatMessageContent({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let paragraph: string[] = [];
  let unordered: string[] = [];
  let ordered: string[] = [];
  let key = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const content = paragraph.join(" ").trim();
    if (content) blocks.push(<p key={`p-${key++}`} style={css("margin:0;line-height:1.55")}>{chatInline(content, `p-${key}`)}</p>);
    paragraph = [];
  };
  const flushLists = () => {
    if (unordered.length) {
      blocks.push(
        <ul key={`ul-${key++}`} style={css("margin:0;padding-left:1.15rem;display:flex;flex-direction:column;gap:0.28rem") }>
          {unordered.map((item, index) => <li key={index} style={css("padding-left:0.15rem;line-height:1.5")}>{chatInline(item, `ul-${key}-${index}`)}</li>)}
        </ul>,
      );
      unordered = [];
    }
    if (ordered.length) {
      blocks.push(
        <ol key={`ol-${key++}`} style={css("margin:0;padding-left:1.3rem;display:flex;flex-direction:column;gap:0.3rem") }>
          {ordered.map((item, index) => <li key={index} style={css("padding-left:0.15rem;line-height:1.5")}>{chatInline(item, `ol-${key}-${index}`)}</li>)}
        </ol>,
      );
      ordered = [];
    }
  };
  const flush = () => {
    flushParagraph();
    flushLists();
  };

  lines.forEach(rawLine => {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flush();
      return;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      flush();
      const level = heading[1].length;
      blocks.push(<div key={`heading-${key++}`} style={css("margin:" + (blocks.length ? "0.2rem 0 0" : "0") + ";font-size:" + (level === 1 ? "1rem" : level === 2 ? "0.94rem" : "0.88rem") + ";font-weight:500;line-height:1.35;color:var(--fg)")}>{chatInline(heading[2], `heading-${key}`)}</div>);
      return;
    }
    if (/^[-*]\s+/.test(line.trim())) {
      flushParagraph();
      if (ordered.length) flushLists();
      unordered.push(line.trim().replace(/^[-*]\s+/, ""));
      return;
    }
    if (/^\d+\.\s+/.test(line.trim())) {
      flushParagraph();
      if (unordered.length) flushLists();
      ordered.push(line.trim().replace(/^\d+\.\s+/, ""));
      return;
    }
    if (/^---+$/.test(line.trim())) {
      flush();
      blocks.push(<hr key={`hr-${key++}`} style={css("width:100%;margin:0.1rem 0;border:0;border-top:1px solid var(--border-soft)")} />);
      return;
    }
    paragraph.push(line.trim());
  });
  flush();

  return <div className="pt-chat-message-content" style={css("display:flex;flex-direction:column;gap:0.55rem;min-width:0")}>{blocks}</div>;
}

function ProgressHeader({
  state,
  actions,
  chatOpen,
  chatClosing,
  activeSession,
  messages,
  onOpenChat,
  onCloseChat,
  onSend,
  onSendTicket,
  ticketFeedback,
}: {
  state: PortalState;
  actions: PortalActions;
  chatOpen: boolean;
  chatClosing: boolean;
  activeSession: ProgressChatSession | null;
  messages: ProgressChatMessage[];
  onOpenChat: () => void;
  onCloseChat: () => void;
  onSend: (text: string) => void;
  onSendTicket: () => void;
  ticketFeedback: boolean;
}) {
  const hero = state.role === "client" ? { ...HERO.client, name: state.clientName } : HERO[state.role];
  const [historyClosing, setHistoryClosing] = useState(false);
  const historyCloseTimer = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (historyCloseTimer.current != null) window.clearTimeout(historyCloseTimer.current);
    };
  }, []);
  const openHistory = () => {
    if (historyCloseTimer.current != null) window.clearTimeout(historyCloseTimer.current);
    historyCloseTimer.current = null;
    setHistoryClosing(false);
    actions.patch({ progressChatHistoryOpen: true });
  };
  const closeHistory = () => {
    if (!state.progressChatHistoryOpen || historyClosing) return;
    setHistoryClosing(true);
    historyCloseTimer.current = window.setTimeout(() => {
      actions.patch({ progressChatHistoryOpen: false });
      setHistoryClosing(false);
      historyCloseTimer.current = null;
    }, 210);
  };
  const toggleHistory = () => {
    if (state.progressChatHistoryOpen) closeHistory();
    else openHistory();
  };
  const go = (text: string) => {
    const t = (text || "").trim();
    if (!t) return;
    onSend(t);
  };
  if (chatOpen) {
    const hasUserMessage = messages.some(message => message.from === "user");
    const sent = activeSession?.status === "sent";
    const title = activeSession?.title || "New Snapshot chat";
    return (
      <div className={"pt-progress-chat-shell" + (chatClosing ? " is-exiting" : "") + (state.progressChatHistoryOpen ? " has-history" : "") + (ticketFeedback ? " has-ticket-feedback" : "")} style={css("height:" + (state.isMobile ? "27rem" : "24.5rem") + ";border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 6%,var(--surface) 94%),var(--surface));display:flex;gap:0.65rem")}>
        <div style={css("min-width:0;flex:1;height:100%;display:flex;flex-direction:column;gap:0.3rem;position:relative;z-index:2;transition:flex-basis .28s cubic-bezier(.22,1,.36,1),opacity .2s ease")}>
          <div style={css("position:relative;z-index:4;display:flex;align-items:center;gap:0.42rem;height:2.05rem;border-radius:999px;background:var(--accent-grad);color:#fff;padding:0 0.4rem 0 0.5rem;box-sizing:border-box")}>
            <span style={css("width:1.3rem;height:1.3rem;border-radius:50%;display:grid;place-items:center;color:rgba(255,255,255,.92);background:rgba(255,255,255,.12);flex-shrink:0")}><Icon name="edit" size={13} /></span>
            <span style={css("width:1px;height:1.1rem;background:rgba(255,255,255,.26);flex-shrink:0")} />
            <button type="button" onClick={openHistory} style={css("min-width:0;display:inline-flex;align-items:center;gap:0.3rem;border:0;background:transparent;color:#fff;cursor:pointer;padding:0;flex:1;text-align:left")}>
              <span style={css("min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:" + (state.isMobile ? "0.8rem" : "0.88rem") + ";font-weight:500")}>{title}</span>
              <Icon name="chevright" size={13} />
            </button>
            <button
              type="button"
              onClick={onSendTicket}
              aria-label={sent ? "Added to Inbox" : "Send as ticket"}
              title={sent ? "Added to Inbox" : "Send as ticket"}
              className={"pt-progress-chatbar-action" + (ticketFeedback ? " is-sent-pulse" : "")}
              style={css("height:1.6rem;border:0;border-radius:999px;background:" + (sent ? "rgba(216,246,224,.24)" : "rgba(255,255,255,.1)") + ";color:#fff;display:inline-flex;align-items:center;gap:0.35rem;cursor:" + (!hasUserMessage || sent ? "default" : "pointer") + ";padding:0 0.5rem;font-size:0.76rem;font-weight:500;opacity:" + (!hasUserMessage ? ".55" : "1") + ";white-space:nowrap;flex-shrink:0")}
            >
              <Icon name={sent ? "inbox" : "msg"} size={13} />
              {!state.isMobile && <span>{sent ? "Added to Inbox" : "Send as ticket"}</span>}
            </button>
            <button type="button" onClick={toggleHistory} aria-label="View history" title="View history" className="pt-progress-chatbar-icon" style={css("width:1.6rem;height:1.6rem;border:0;border-radius:50%;background:" + (state.progressChatHistoryOpen ? "rgba(255,255,255,.16)" : "transparent") + ";color:#fff;display:grid;place-items:center;cursor:pointer;flex-shrink:0")}>
              <Icon name="history" size={13} />
            </button>
            <button type="button" onClick={onCloseChat} aria-label="Minimize chat" title="Minimize chat" className="pt-progress-chatbar-icon" style={css("width:1.6rem;height:1.6rem;border:0;border-radius:50%;background:transparent;color:#fff;display:grid;place-items:center;cursor:pointer;flex-shrink:0")}>
              <Icon name="minus" size={13} />
            </button>
          </div>
          {ticketFeedback && (
            <div className="pt-ticket-added-toast" style={css("position:absolute;right:0.75rem;top:2.45rem;z-index:6;display:inline-flex;align-items:center;gap:0.45rem;border:1px solid color-mix(in srgb,var(--success) 22%,var(--border-soft) 78%);border-radius:999px;background:color-mix(in srgb,var(--success) 14%,var(--surface) 86%);color:var(--success);padding:0.4rem 0.65rem;font-size:0.74rem;font-weight:500;box-shadow:0 0.75rem 1.4rem color-mix(in srgb,var(--success) 12%,transparent 88%)")}>
              <Icon name="inbox" size={13} />
              Added to Inbox
            </div>
          )}
          <div style={css("position:absolute;inset:auto 1rem -1.6rem auto;width:6.6rem;height:6.6rem;border-radius:50%;background:color-mix(in srgb,var(--accent) 5%,transparent 95%)")} />
          <ProgressChatPanel state={state} actions={actions} messages={messages} onSend={onSend} embedded closing={chatClosing} />
        </div>
        {(state.progressChatHistoryOpen || historyClosing) && (
          <ProgressChatHistory
            state={state}
            actions={actions}
            onNew={() => actions.createProgressChatSession()}
            onClose={closeHistory}
            closing={historyClosing}
          />
        )}
      </div>
    );
  }
  return (
    <div style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:color-mix(in srgb,var(--accent) 5%,var(--surface) 95%);padding:" + (state.isMobile ? "1.4rem 1.1rem 1.25rem" : "1.85rem 1.5rem 1.45rem") + ";text-align:center")}>
      <h2 style={css("margin:0;font-size:var(--text-3xl);font-weight:500;line-height:1.12")}>Hello, {hero.name}</h2>
      <p style={css("margin:0.4rem auto 0;max-width:34rem;font-size:var(--text-md);line-height:1.5;color:var(--fg-muted)")}>{hero.sub}</p>

      <div style={css("display:flex;align-items:center;gap:0.55rem;max-width:34rem;margin:1.15rem auto 0;border:1px solid var(--border);border-radius:999px;background:var(--surface);padding:0.4rem 0.45rem 0.4rem 0.95rem;box-shadow:0 1px 2px color-mix(in srgb,var(--fg) 5%,transparent 95%)")}>
        <span style={css("color:var(--fg-faint);display:flex;flex-shrink:0")}><Icon name="search" size={17} /></span>
        <input
          value={state.chatDraft}
          onChange={e => actions.patch({ chatDraft: e.target.value })}
          onFocus={onOpenChat}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); go(state.chatDraft); } }}
          placeholder={hero.ph}
          style={css("flex:1;border:none;background:transparent;padding:0.5rem 0.1rem;font-size:var(--text-md);color:var(--fg);min-width:0;outline:none;text-align:left")}
        />
        <button type="button" onClick={() => go(state.chatDraft)} title="Send" className="pt-op" style={css("width:2.3rem;height:2.3rem;border-radius:50%;border:none;display:grid;place-items:center;background:var(--accent);color:#fff;cursor:pointer;flex-shrink:0")}><Icon name="arrowup" size={16} /></button>
      </div>

      <div style={css("margin-top:1.25rem;text-align:left;display:flex;flex-direction:column;gap:0.55rem")}>
        {state.role === "admin"
          ? <><AdminStats actions={actions} /><AdminPipeline state={state} actions={actions} /></>
          : state.role === "dev"
            ? <><ManagerStats state={state} actions={actions} /><ManagerPipeline state={state} actions={actions} /></>
            : <><ClientStats state={state} actions={actions} /><ClientPipeline state={state} actions={actions} /></>}
      </div>
    </div>
  );
}

function ProgressChatHistory({
  state,
  actions,
  onNew,
  onClose,
  closing,
}: {
  state: PortalState;
  actions: PortalActions;
  onNew: () => void;
  onClose: () => void;
  closing: boolean;
}) {
  const sessions = state.progressChatSessions;
  return (
    <aside className={"pt-progress-chat-history-sidebar" + (closing ? " is-exiting" : "")} style={css((state.isMobile ? "position:absolute;right:0.65rem;top:3rem;bottom:0.65rem;width:min(18rem,calc(100% - 1.3rem));z-index:8;" : "position:relative;width:17rem;height:100%;flex-shrink:0;") + "overflow:hidden;border:1px solid var(--border-soft);border-radius:1.15rem;background:color-mix(in srgb,var(--surface) 94%,white 6%);display:flex;flex-direction:column;box-shadow:0 1rem 2rem color-mix(in srgb,var(--fg) 7%,transparent 93%)")}>
        <div style={css("padding:0.85rem 0.9rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;gap:0.65rem")}>
          <span style={css("width:2rem;height:2rem;border-radius:50%;display:grid;place-items:center;background:var(--accent-soft);color:var(--accent);flex-shrink:0")}><Icon name="history" size={15} /></span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={css("font-size:0.9rem;font-weight:500;color:var(--fg)")}>Chat history</div>
            <div style={css("font-size:0.7rem;color:var(--fg-muted)")}>{sessions.length || "No"} saved session{sessions.length === 1 ? "" : "s"}</div>
          </div>
          <button type="button" onClick={onNew} className="pt-softbtn" style={css("height:1.85rem;padding:0 0.62rem;border-radius:999px;border:1px solid var(--border-soft);background:var(--surface);color:var(--fg-muted);font-size:var(--text-xs);font-weight:500;cursor:pointer")}>New</button>
          {sessions.length > 0 && <button type="button" onClick={() => { if (window.confirm("Delete all Snapshot chat history? This cannot be undone.")) actions.clearProgressChatHistory(); }} className="pt-softbtn" style={css("height:1.85rem;padding:0 0.62rem;border-radius:999px;border:1px solid color-mix(in srgb,var(--danger) 25%,var(--border-soft) 75%);background:var(--surface);color:var(--danger);font-size:var(--text-xs);font-weight:500;cursor:pointer")}>Clear</button>}
          <button type="button" onClick={onClose} aria-label="Close history" className="pt-iconbtn" style={css("width:1.85rem;height:1.85rem;border-radius:50%;border:1px solid var(--border-soft);background:var(--surface);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer;flex-shrink:0")}><Icon name="x" size={12} /></button>
        </div>
        <div className="pt-progress-chat-history-list" style={css("flex:1;min-height:0;overflow-y:auto;padding:0.45rem;display:flex;flex-direction:column;gap:0.3rem")}>
          {sessions.length === 0 && <div style={css("padding:1.5rem 0.8rem;text-align:center;color:var(--fg-muted);font-size:0.8rem")}>Start a chat and it will appear here.</div>}
          {sessions.map(session => {
            const active = session.id === state.activeProgressChatId;
            return (
              <div key={session.id} className="pt-menuitem" style={css("display:flex;align-items:center;gap:0.35rem;width:100%;border:1px solid " + (active ? "var(--accent-dim)" : "transparent") + ";border-radius:0.85rem;background:" + (active ? "var(--accent-soft)" : "transparent") + ";padding:0.25rem")}>
                <button type="button" onClick={() => actions.selectProgressChatSession(session.id)} style={css("min-width:0;flex:1;display:flex;align-items:center;gap:0.65rem;border:0;border-radius:0.7rem;background:transparent;padding:0.37rem 0.4rem;cursor:pointer;text-align:left")}>
                  <span style={css("width:1.85rem;height:1.85rem;border-radius:50%;display:grid;place-items:center;background:var(--surface-alt);color:" + (session.status === "sent" ? "var(--success)" : "var(--fg-muted)") + ";flex-shrink:0")}><Icon name={session.status === "sent" ? "ticket" : "msg"} size={14} /></span>
                  <span style={css("min-width:0;flex:1")}>
                    <span style={css("display:block;font-size:0.8rem;font-weight:500;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{session.title}</span>
                    <span style={css("display:block;margin-top:0.1rem;font-size:var(--text-2xs);color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{session.status === "sent" && session.ticketId ? session.ticketId + " · " : ""}{sessionDateLabel(session.updatedAt)}</span>
                  </span>
                </button>
                <button type="button" aria-label={`Delete ${session.title}`} title="Delete chat" onClick={() => { if (window.confirm(`Delete “${session.title}”? This cannot be undone.`)) actions.deleteProgressChatSession(session.id); }} style={css("width:1.85rem;height:1.85rem;border:0;border-radius:50%;background:transparent;color:var(--danger);display:grid;place-items:center;cursor:pointer;flex-shrink:0")}><Icon name="trash" size={13} /></button>
              </div>
            );
          })}
        </div>
      </aside>
  );
}

function ProgressChatPanel({
  state,
  actions,
  messages,
  onSend,
  embedded = false,
  closing = false,
}: {
  state: PortalState;
  actions: PortalActions;
  messages: ProgressChatMessage[];
  onSend: (text: string) => void;
  embedded?: boolean;
  closing?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const hero = state.role === "client" ? { ...HERO.client, name: state.clientName } : HERO[state.role];
  const waiting = messages.some(message => message.pending);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.scrollTo({ top: messages.length === 0 ? 0 : canvas.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const addFiles = (files: FileList | null) => {
    const picked = Array.from(files || []);
    if (picked.length) setAttachments(prev => [...prev, ...picked]);
  };
  const removeAttachment = (index: number) => setAttachments(prev => prev.filter((_, i) => i !== index));
  const submitDraft = () => {
    if (waiting) return;
    const text = state.chatDraft.trim();
    if (!text && attachments.length === 0) return;
    const withFiles = attachments.length
      ? (text ? text + " " : "") + "📎 " + attachments.map(file => file.name).join(", ")
      : text;
    onSend(withFiles);
    setAttachments([]);
  };

  const suggestions = state.role === "client"
    ? ["What needs me next?", "Show my latest audit plan", "What changed recently?", "Show my open approvals"]
    : state.role === "dev"
      ? ["What needs attention today?", "Which client is blocked?", "Summarize my approvals", "What changed recently?"]
      : ["What should I fix first?", "Show audit risks", "Which clients need a nudge?", "What changed recently?"];

  return (
    <section className={embedded ? "pt-progress-chat-panel" + (closing ? " is-exiting" : "") : undefined} style={css("height:" + (embedded ? "calc(100% - 2.35rem)" : (state.isMobile ? "29rem" : "34rem")) + ";border:" + (embedded ? "0" : "1px solid var(--border-soft)") + ";border-radius:" + (embedded ? "0.95rem" : "var(--radius-panel)") + ";background:" + (embedded ? "transparent" : "var(--surface)") + ";display:flex;flex-direction:column;overflow:hidden;text-align:left;position:relative")}>
      {!embedded && <div style={css("padding:0.95rem 1.05rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;gap:0.7rem")}>
        <span style={css("width:2.15rem;height:2.15rem;border-radius:50%;background:color-mix(in srgb,var(--accent) 12%,white 88%);color:var(--accent);display:grid;place-items:center;flex-shrink:0")}>
          <Icon name="layers" size={15} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 style={css("margin:0;font-size:0.98rem;font-weight:500")}>Ask Baltz AI</h3>
          <p style={css("margin:0.12rem 0 0;font-size:0.76rem;color:var(--fg-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{hero.ph}</p>
        </div>
      </div>}
      <div ref={canvasRef} className="pt-progress-chat-canvas" style={css("flex:1;min-height:0;padding:" + (state.isMobile ? "0.7rem 0.85rem 0.7rem" : "0.7rem 1rem") + ";overflow-y:auto;overflow-x:hidden;background:transparent;scroll-behavior:smooth")}>
        <div style={css("min-height:100%;display:flex;flex-direction:column;justify-content:" + (messages.length === 0 ? "center" : "flex-end") + ";gap:0.7rem")}>
          {messages.length === 0 && (
            <div style={css("margin:0 auto;max-width:" + (state.isMobile ? "24rem" : "34rem") + ";text-align:center;padding:0.3rem 0")}>
              <h3 style={css("margin:0;font-size:0.96rem;font-weight:500;line-height:1.25")}>Start from the workspace, not a blank chat.</h3>
              <p style={css("margin:0.28rem auto 0;max-width:24rem;font-size:0.78rem;line-height:1.4;color:var(--fg-muted)")}>Ask about clients, audits, funnels, tasks, or the next decision.</p>
              <div style={css("text-transform:uppercase;font-size:0.68rem;font-weight:400;letter-spacing:0.04em;line-height:1.2;color:var(--fg-faint);text-align:center;margin-top:0.95rem;margin-bottom:0.42rem")}>Try asking</div>
              <div style={css("display:grid;grid-template-columns:" + (state.isMobile ? "1fr" : "1fr 1fr") + ";gap:0.42rem")}>
                {suggestions.map(suggestion => (
                  <button key={suggestion} type="button" onClick={() => onSend(suggestion)} className="pt-suggest-card" style={css("display:flex;align-items:center;gap:0.62rem;width:100%;padding:0.5rem 0.7rem;border:1px solid var(--border-soft);border-radius:999px;background:var(--surface);color:var(--fg);cursor:pointer;text-align:left")}>
                    <span style={css("width:1.65rem;height:1.65rem;border-radius:50%;flex-shrink:0;background:color-mix(in srgb,var(--accent) 12%,white 88%);color:var(--accent);display:grid;place-items:center")}><Icon name={suggestionIcon(suggestion)} size={13} /></span>
                    <span style={css("flex:1;min-width:0;font-size:var(--text-base);font-weight:500;line-height:1.3")}>{suggestion}</span>
                    <span className="pt-suggest-arrow" style={css("color:var(--accent);display:grid;place-items:center;flex-shrink:0")}><Icon name="arrow" size={13} /></span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map(message => {
            const mine = message.from === "user";
            return (
              <div key={message.id} className="pt-progress-message" style={css("display:flex;justify-content:" + (mine ? "flex-end" : "flex-start"))}>
                <div aria-busy={message.pending || undefined} style={css("max-width:min(36rem,88%);border-radius:" + (mine ? "1.15rem 1.15rem 0.35rem 1.15rem" : "1.15rem 1.15rem 1.15rem 0.35rem") + ";padding:0.72rem 0.85rem;background:" + (mine ? "var(--accent)" : message.error ? "color-mix(in srgb,var(--danger) 7%,var(--surface) 93%)" : "color-mix(in srgb,var(--surface) 88%,transparent 12%)") + ";color:" + (mine ? "#fff" : message.error ? "var(--danger)" : "var(--fg)") + ";border:1px solid " + (mine ? "transparent" : message.error ? "color-mix(in srgb,var(--danger) 24%,var(--border-soft) 76%)" : "color-mix(in srgb,var(--border-soft) 68%,transparent 32%)") + ";font-size:0.86rem;line-height:1.45;white-space:" + (mine ? "pre-wrap" : "normal"))}>
                  {mine ? message.text : <ChatMessageContent text={message.text} />}
                  <div style={css("margin-top:0.28rem;font-size:var(--text-2xs);color:" + (mine ? "rgba(255,255,255,.72)" : "var(--fg-faint)"))}>{message.time}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className={embedded ? "pt-progress-chat-composer" + (closing ? " is-exiting" : "") : undefined} style={css("border-top:1px solid color-mix(in srgb,var(--border-soft) 68%,transparent 32%);padding:0.52rem 0.55rem 0.48rem;background:transparent")}>
        {messages.length > 0 && (
          <div className="pt-suggest-row" style={css("display:flex;flex-wrap:wrap;justify-content:center;gap:0.4rem;padding-bottom:0.42rem")}>
            {suggestions.map(suggestion => (
              <button key={suggestion} type="button" onClick={() => onSend(suggestion)} className="pt-suggest-chip" style={css("display:inline-flex;align-items:center;gap:0.4rem;white-space:nowrap;border:1px solid color-mix(in srgb,var(--accent) 14%,var(--border-soft) 86%);border-radius:999px;background:color-mix(in srgb,var(--surface) 82%,transparent 18%);color:var(--fg);font-size:var(--text-sm);font-weight:500;padding:0.4rem 0.82rem 0.4rem 0.58rem;cursor:pointer")}>
                <span style={css("display:grid;place-items:center;width:1.15rem;height:1.15rem;border-radius:50%;flex-shrink:0;background:color-mix(in srgb,var(--accent) 14%,white 86%);color:var(--accent)")}><Icon name={suggestionIcon(suggestion)} size={11} /></span>
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {attachments.length > 0 && (
          <div style={css("display:flex;flex-wrap:wrap;gap:0.4rem;padding:0 0.3rem 0.42rem")}>
            {attachments.map((file, index) => (
              <span key={file.name + index} style={css("display:inline-flex;align-items:center;gap:0.4rem;max-width:14rem;border:1px solid var(--border-soft);border-radius:999px;background:var(--surface);color:var(--fg);padding:0.26rem 0.32rem 0.26rem 0.56rem;font-size:var(--text-xs);font-weight:500")}>
                <span style={css("color:var(--accent);display:flex;flex-shrink:0")}><Icon name="file" size={12} /></span>
                <span style={css("min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap")}>{file.name}</span>
                <button type="button" onClick={() => removeAttachment(index)} aria-label={"Remove " + file.name} className="pt-iconbtn" style={css("width:1.1rem;height:1.1rem;border:none;border-radius:50%;background:var(--surface-alt);color:var(--fg-muted);display:grid;place-items:center;cursor:pointer;flex-shrink:0")}><Icon name="x" size={10} /></button>
              </span>
            ))}
          </div>
        )}
        <div style={css("display:flex;align-items:flex-end;gap:0.4rem;border:1px solid var(--border);border-radius:999px;background:color-mix(in srgb,var(--surface) 76%,transparent 24%);padding:0.34rem 0.4rem")}>
          <input ref={fileInputRef} type="file" multiple onChange={e => { addFiles(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
          <button type="button" onClick={() => fileInputRef.current?.click()} title="Attach files" aria-label="Attach files" className="pt-iconbtn" style={css("width:2.15rem;height:2.15rem;border-radius:50%;border:none;background:transparent;color:var(--fg-muted);display:grid;place-items:center;cursor:pointer;flex-shrink:0")}>
            <Icon name="clip" size={17} />
          </button>
          <textarea
            value={state.chatDraft}
            onChange={e => actions.patch({ chatDraft: e.target.value })}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitDraft(); } }}
            placeholder="Ask about this workspace..."
            rows={1}
            style={css("flex:1;min-height:2.2rem;max-height:7.5rem;overflow-y:auto;border:none;background:transparent;outline:none;resize:none;font-family:inherit;font-size:0.9rem;line-height:1.45;color:var(--fg);padding:0.43rem 0;min-width:0")}
          />
          <button type="button" onClick={submitDraft} disabled={waiting} title={waiting ? "Waiting for Snapshot" : "Send"} className="pt-op" style={css("width:2.45rem;height:2.45rem;border-radius:50%;border:none;background:var(--accent);color:#fff;display:grid;place-items:center;cursor:" + (waiting ? "wait" : "pointer") + ";opacity:" + (waiting ? ".55" : "1") + ";flex-shrink:0")}>
            <Icon name="arrowup" size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

export function Progress({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatClosing, setChatClosing] = useState(false);
  const [ticketFeedback, setTicketFeedback] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const ticketTimer = useRef<number | null>(null);
  const ticketRedirectTimer = useRef<number | null>(null);
  const { role } = state;
  const activeSession = state.progressChatSessions.find(session => session.id === state.activeProgressChatId) || null;
  const messages = activeSession?.messages || [];
  const openProgressChat = () => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setChatClosing(false);
    actions.createProgressChatSession();
    setChatOpen(true);
  };
  const closeProgressChat = () => {
    if (!chatOpen || chatClosing) return;
    setChatClosing(true);
    closeTimer.current = window.setTimeout(() => {
      setChatOpen(false);
      setChatClosing(false);
      closeTimer.current = null;
    }, 440);
  };
  useEffect(() => {
    return () => {
      if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
      if (ticketTimer.current != null) window.clearTimeout(ticketTimer.current);
      if (ticketRedirectTimer.current != null) window.clearTimeout(ticketRedirectTimer.current);
    };
  }, []);
  const sendProgressChat = (text: string) => {
    const clean = text.trim();
    if (!clean) {
      openProgressChat();
      return;
    }
    openProgressChat();
    actions.sendProgressChatMessage(clean);
  };
  const sendProgressChatAsTicket = () => {
    const canSend = !!activeSession && activeSession.status !== "sent" && messages.some(message => message.from === "user");
    actions.sendProgressChatAsTicket();
    if (!canSend) return;
    if (ticketTimer.current != null) window.clearTimeout(ticketTimer.current);
    if (ticketRedirectTimer.current != null) window.clearTimeout(ticketRedirectTimer.current);
    setTicketFeedback(true);
    ticketTimer.current = window.setTimeout(() => {
      setTicketFeedback(false);
      ticketTimer.current = null;
    }, 1800);
    ticketRedirectTimer.current = window.setTimeout(() => {
      actions.setView("inbox");
      ticketRedirectTimer.current = null;
    }, 850);
  };
  const progressBody = role === "client"
    ? <ClientProgressBody state={state} actions={actions} hideHero hideStats />
    : role === "dev"
      ? <ManagerProgressBody state={state} actions={actions} hideStats />
      : <AdminProgressBody state={state} actions={actions} hideStats />;

  return (
    <div style={css("display:flex;flex-direction:column;gap:var(--space-4)")}>
      <ProgressHeader state={state} actions={actions} chatOpen={chatOpen} chatClosing={chatClosing} activeSession={activeSession} messages={messages} onOpenChat={openProgressChat} onCloseChat={closeProgressChat} onSend={sendProgressChat} onSendTicket={sendProgressChatAsTicket} ticketFeedback={ticketFeedback} />
      <div className={chatOpen ? "pt-progress-below-fade" : undefined}>
        {progressBody}
      </div>
      <section style={css("display:flex;flex-direction:column;gap:0.65rem")}>
        <div style={css("display:flex;align-items:flex-end;justify-content:space-between;gap:0.8rem;padding:0 0.15rem")}>
          <div><h3 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Calendar</h3><div style={css("margin-top:0.15rem;font-size:var(--text-xs);color:var(--fg-muted)")}>Task deadlines across your current workspace.</div></div>
          <button type="button" onClick={() => { actions.patch({ taskView: "board" }); actions.setView("tasks"); }} style={css("border:none;background:none;color:var(--accent);font-size:var(--text-xs);font-weight:500;cursor:pointer")}>Open board</button>
        </div>
        <TaskCalendar state={state} actions={actions} tasks={roleTasks(state)} />
      </section>
    </div>
  );
}
