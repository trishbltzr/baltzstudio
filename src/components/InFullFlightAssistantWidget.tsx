"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Bot, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed, Clock3, Coins, Lock, MessageSquareText, Pencil, Plus, Send, X } from "lucide-react";
import {
  classifyPrototypeRequest,
  getPrototypePreviewPath,
  type InFullFlightWorkspace,
  type PrototypeDecision,
} from "@/lib/inFullFlightPrototype";

type PrototypeMessage = {
  id: string;
  role: "assistant" | "client" | "system";
  body: string;
  meta: string;
};

type PrototypeRequestStatus =
  | "classifying"
  | "preview_generating"
  | "preview_ready"
  | "needs_clarification"
  | "out_of_scope"
  | "new_revision_round"
  | "approved";

type PrototypeRequest = {
  id: string;
  prompt: string;
  summary: string;
  decision: PrototypeDecision;
  status: PrototypeRequestStatus;
  previewUrl?: string;
  createdAt: number;
};

function statusLabel(status: PrototypeRequestStatus) {
  switch (status) {
    case "classifying":
      return "Classifying";
    case "preview_generating":
      return "Generating preview";
    case "preview_ready":
      return "Preview ready";
    case "approved":
      return "Approved";
    case "out_of_scope":
      return "Out of scope";
    case "new_revision_round":
      return "New round";
    default:
      return "Needs clarification";
  }
}

function requestTimestamp(createdAt: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(createdAt);
}

function countApproxTokens(text: string) {
  return Math.max(1, Math.ceil(text.trim().length / 4));
}

function requestBadgeClass(status: PrototypeRequestStatus) {
  return `is-${status.replace(/_/g, "-")}`;
}

function clientFirstName(clientName: string) {
  const sanitized = clientName.replace(/&.*$/, "").trim();
  return sanitized.split(/\s+/)[0] ?? clientName;
}

function messageAvatar(role: PrototypeMessage["role"], clientName: string) {
  if (role === "client") return clientName.charAt(0).toUpperCase();
  if (role === "system") return <Lock size={14} />;
  return <Bot size={14} />;
}

const SUGGESTIONS = [
  "Update the hero headline",
  "Swap a section image",
  "Add a testimonial",
  "Refresh the banner copy",
];

export function InFullFlightAssistantWidget({
  workspace,
  shellClassName = "",
  defaultOpen = false,
}: {
  workspace: InFullFlightWorkspace;
  shellClassName?: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [screen, setScreen] = useState<"intro" | "chat">("intro");
  const [messages, setMessages] = useState<PrototypeMessage[]>([]);
  const [requests, setRequests] = useState<PrototypeRequest[]>([]);
  const [input, setInput] = useState("");
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const timersRef = useRef<number[]>([]);
  const threadRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const storageKey = `iff-widget:${workspace.slug}`;
  const firstName = clientFirstName(workspace.clientName);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    try {
      const savedState = window.localStorage.getItem(storageKey);
      if (savedState) {
        const parsed = JSON.parse(savedState) as {
          activePreviewId?: string | null;
          messages?: PrototypeMessage[];
          requests?: PrototypeRequest[];
          screen?: "intro" | "chat";
        };

        if (Array.isArray(parsed.messages) && parsed.messages.length > 0) setMessages(parsed.messages);
        if (Array.isArray(parsed.requests)) setRequests(parsed.requests);
        if (parsed.activePreviewId) setActivePreviewId(parsed.activePreviewId);
        if (parsed.screen === "chat") setScreen("chat");
      }
    } catch (error) {
      console.error("Unable to restore In Full Flight widget state.", error);
    } finally {
      setIsHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isHydrated) return;

    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          activePreviewId,
          messages,
          requests,
          screen,
        }),
      );
    } catch (error) {
      console.error("Unable to save In Full Flight widget state.", error);
    }
  }, [activePreviewId, isHydrated, messages, requests, screen, storageKey]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [messages, requests]);

  const latestRequest = requests[0] ?? null;
  const activePreviewUrl = activePreviewId ? getPrototypePreviewPath(workspace.slug, activePreviewId) : null;
  const introRequests = requests.slice(0, 3);
  const freeTokenAllowance = 150;
  const tokenUsage = useMemo(() => {
    const messageTokens = messages.reduce(
      (total, message) => total + countApproxTokens(`${message.meta} ${message.body}`),
      0,
    );
    const requestTokens = requests.reduce((total, request) => {
      const previewPart = request.previewUrl ?? "";
      return total + countApproxTokens(`${request.prompt} ${request.summary} ${request.status} ${previewPart}`);
    }, 0);

    return messageTokens + requestTokens;
  }, [messages, requests]);
  const remainingFreeTokens = Math.max(0, freeTokenAllowance - tokenUsage);

  const queueCounts = useMemo(
    () => ({
      ready: requests.filter(r => r.status === "preview_ready").length,
      held: requests.filter(r =>
        r.status === "out_of_scope" || r.status === "new_revision_round" || r.status === "needs_clarification",
      ).length,
    }),
    [requests],
  );

  function addMessage(message: PrototypeMessage) {
    setMessages(prev => [...prev, message]);
  }

  function queueTimer(callback: () => void, delay: number) {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  }

  function openChat(prefill?: string) {
    setScreen("chat");
    if (typeof prefill === "string") setInput(prefill);
    setTimeout(() => composerRef.current?.focus(), 80);
  }

  function startNewThread() {
    setMessages([]);
    setRequests([]);
    setActivePreviewId(null);
    setInput("");
    setScreen("intro");
  }

  function submitRequest(rawInput: string) {
    const prompt = rawInput.trim();
    if (!prompt) return;

    const requestId = `request-${Date.now()}`;

    setScreen("chat");
    setInput("");
    addMessage({ id: `${requestId}-client`, role: "client", meta: workspace.clientName, body: prompt });

    setRequests(prev => [
      {
        id: requestId,
        prompt,
        summary: "Checking request scope and allowed edit type.",
        decision: "accepted",
        status: "classifying",
        createdAt: Date.now(),
      },
      ...prev,
    ]);

    addMessage({
      id: `${requestId}-triage`,
      role: "assistant",
      meta: "In Full Flight",
      body: "Reviewing the request against your support scope now.",
    });

    queueTimer(() => {
      const plan = classifyPrototypeRequest(prompt);

      if (plan.decision === "accepted" && plan.previewSnapshotId) {
        const previewSnapshotId = plan.previewSnapshotId;
        const previewUrl = getPrototypePreviewPath(workspace.slug, previewSnapshotId);

        setRequests(prev =>
          prev.map(request =>
            request.id === requestId
              ? {
                  ...request,
                  summary: plan.summary,
                  decision: plan.decision,
                  status: "preview_generating",
                  previewUrl,
                }
              : request,
          ),
        );

        addMessage({
          id: `${requestId}-accepted`,
          role: "assistant",
          meta: "In Full Flight",
          body: plan.assistantReply,
        });

        queueTimer(() => {
          setRequests(prev =>
            prev.map(request =>
              request.id === requestId
                ? { ...request, status: "preview_ready" }
                : request,
            ),
          );
          setActivePreviewId(previewSnapshotId);
          addMessage({
            id: `${requestId}-preview`,
            role: "assistant",
            meta: "Preview ready",
            body: "Your preview is ready. Approve it to lock this direction, or tell me what to adjust.",
          });
        }, 1100);

        return;
      }

      const status: PrototypeRequestStatus =
        plan.decision === "out_of_scope"
          ? "out_of_scope"
          : plan.decision === "new_revision_round"
            ? "new_revision_round"
            : "needs_clarification";

      setRequests(prev =>
        prev.map(request =>
          request.id === requestId
            ? {
                ...request,
                decision: plan.decision,
                summary: plan.summary,
                status,
              }
            : request,
        ),
      );

      addMessage({
        id: `${requestId}-response`,
        role: plan.decision === "needs_clarification" ? "assistant" : "system",
        meta: plan.decision === "needs_clarification" ? "In Full Flight" : "Scope boundary",
        body: plan.assistantReply,
      });
    }, 700);
  }

  function approveLatestPreview() {
    if (!latestRequest || latestRequest.status !== "preview_ready") return;

    setRequests(prev =>
      prev.map(request =>
        request.id === latestRequest.id
          ? { ...request, status: "approved" }
          : request,
      ),
    );

    addMessage({
      id: `${latestRequest.id}-approved`,
      role: "assistant",
      meta: "Approved",
      body: "Locked as the latest accepted version. Bigger follow-up changes will start a new round.",
    });
  }

  function requestAnotherPass() {
    if (!latestRequest || latestRequest.status !== "preview_ready") return;
    setInput(`Refine: ${latestRequest.prompt}`);
    composerRef.current?.focus();
  }

  return (
    <section className={shellClassName}>
      <button
        type="button"
        className={`iff-widget-launcher ${isOpen ? "is-open" : ""}`}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close In Full Flight" : "Open In Full Flight"}
        onClick={() => {
          if (isOpen) { setIsOpen(false); return; }
          setScreen(messages.length > 0 ? "chat" : "intro");
          setIsOpen(true);
        }}
      >
        <span className="iff-avatar iff-avatar--bot">
          <MessageSquareText size={15} />
        </span>
      </button>

      {isOpen ? (
        <>
          <div className={`iff-widget ${screen === "intro" ? "iff-widget--intro" : ""}`}>
            <div className="iff-widget-header">
              {screen === "chat" ? (
                <button
                  type="button"
                  className="iff-header-icon-btn"
                  aria-label="Back to home"
                  onClick={() => setScreen("intro")}
                >
                  <ChevronLeft size={15} />
                </button>
              ) : (
                <span className="iff-avatar iff-avatar--bot iff-avatar--sm">
                  <Bot size={13} />
                </span>
              )}
              <div className="iff-widget-header-copy">
                <strong>In Full Flight</strong>
              </div>
              <div className="iff-header-actions">
                {screen === "chat" ? (
                  <button
                    type="button"
                    className="iff-header-icon-btn"
                    aria-label="New thread"
                    onClick={startNewThread}
                  >
                    <Plus size={15} />
                  </button>
                ) : null}
                <button
                  type="button"
                  className="iff-header-icon-btn"
                  aria-label="Close assistant"
                  onClick={() => setIsOpen(false)}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {screen === "intro" ? (
              <div className="iff-intro">
                <div className="iff-intro-greeting">
                  <p className="iff-intro-hi">Hi {firstName}.</p>
                  <p className="iff-intro-sub">What do you want to change?</p>
                </div>

                <div className="iff-intro-section">
                  <div className="iff-intro-suggestions">
                    {SUGGESTIONS.map(text => (
                      <button
                        key={text}
                        type="button"
                        className="iff-intro-suggestion"
                        onClick={() => openChat(text)}
                      >
                        {text}
                        <ChevronRight size={12} className="iff-intro-suggestion-arrow" />
                      </button>
                    ))}
                  </div>
                </div>

                {introRequests.length > 0 ? (
                  <div className="iff-intro-section">
                    <span className="iff-intro-label">Recent</span>
                    <div className="iff-intro-history">
                      {introRequests.map(request => (
                        <button
                          key={request.id}
                          type="button"
                          className="iff-intro-history-item"
                          onClick={() => openChat()}
                        >
                          <strong>{request.prompt}</strong>
                          <span className={`iff-intro-history-badge ${requestBadgeClass(request.status)}`}>
                            {statusLabel(request.status)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="iff-intro-footer">
                  <div className="iff-intro-tokens">
                    <Coins size={12} />
                    <span>{remainingFreeTokens} of {freeTokenAllowance} tokens left</span>
                  </div>
                  <button type="button" className="iff-intro-start" onClick={() => openChat()}>
                    New request
                    <ArrowUpRight size={12} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div ref={threadRef} className="iff-thread iff-thread--widget">
                  {messages.map(message => (
                    <article key={message.id} className={`iff-message-row iff-message-row--${message.role}`}>
                      <span className={`iff-avatar iff-avatar--xs iff-avatar--${message.role === "client" ? "client" : message.role === "system" ? "system" : "bot"}`}>
                        {messageAvatar(message.role, workspace.clientName)}
                      </span>
                      <div className={`iff-message iff-message--${message.role}`}>
                        <p>{message.body}</p>
                      </div>
                    </article>
                  ))}

                  {latestRequest ? (
                    <section className="iff-widget-artifact">
                      <div className="iff-preview-status-row">
                        <span className={`iff-preview-badge ${requestBadgeClass(latestRequest.status)}`}>
                          {latestRequest.status === "preview_ready" || latestRequest.status === "approved" ? (
                            <CheckCircle2 size={13} />
                          ) : latestRequest.status === "preview_generating" || latestRequest.status === "classifying" ? (
                            <CircleDashed size={13} />
                          ) : latestRequest.status === "out_of_scope" ? (
                            <Lock size={13} />
                          ) : (
                            <Clock3 size={13} />
                          )}
                          {statusLabel(latestRequest.status)}
                        </span>
                        <span className="iff-timestamp">{requestTimestamp(latestRequest.createdAt)}</span>
                      </div>

                      <p className="iff-artifact-summary">{latestRequest.summary}</p>

                      {latestRequest.previewUrl ? (
                        <Link href={latestRequest.previewUrl} className="iff-artifact-link">
                          Open preview
                          <ArrowUpRight size={13} />
                        </Link>
                      ) : null}

                      {latestRequest.status === "preview_ready" ? (
                        <div className="iff-preview-actions">
                          <button type="button" onClick={approveLatestPreview}>
                            <CheckCircle2 size={13} />
                            Approve
                          </button>
                          <button type="button" className="is-secondary" onClick={requestAnotherPass}>
                            Adjust
                          </button>
                        </div>
                      ) : null}

                      {latestRequest.status === "approved" ? (
                        <div className="iff-lock-note">
                          <Lock size={13} />
                          Approved and locked.
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </div>

                <form
                  className="iff-composer iff-composer--widget"
                  onSubmit={event => {
                    event.preventDefault();
                    submitRequest(input);
                  }}
                >
                  <div className="iff-composer-row">
                    <textarea
                      ref={composerRef}
                      value={input}
                      onChange={event => setInput(event.target.value)}
                      placeholder="Describe the change you need..."
                      rows={1}
                      onKeyDown={event => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          submitRequest(input);
                        }
                      }}
                    />
                    <button type="submit" disabled={!input.trim()} aria-label="Send">
                      <Send size={14} />
                    </button>
                  </div>
                  <div className="iff-composer-meta">
                    <Coins size={11} />
                    <span>{remainingFreeTokens} tokens remaining</span>
                  </div>
                </form>
              </>
            )}
          </div>

          {screen === "chat" && activePreviewUrl ? (
            <Link className="iff-dashboard-preview-link" href={activePreviewUrl}>
              Open preview
              <ArrowUpRight size={14} />
            </Link>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
