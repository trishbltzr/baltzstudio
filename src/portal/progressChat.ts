import type { ProgressChatMessage } from "./types";
import type { Role } from "./types";

const FILLER_START = /^(please|pls|can you|could you|would you|i need you to|i need to|i want to|help me|let'?s|we need to|make sure to)\s+/i;

export function summarizeProgressChatTitle(text: string) {
  const clean = text
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim()
    .replace(/[?.!]+$/g, "")
    .replace(FILLER_START, "")
    .trim();

  if (!clean) return "Snapshot request";

  const words = clean.split(" ").slice(0, 7);
  const title = words.join(" ");
  const capped = title.length > 54 ? title.slice(0, 51).trimEnd() + "..." : title;
  return capped.charAt(0).toUpperCase() + capped.slice(1);
}

export function progressChatTranscript(messages: ProgressChatMessage[]) {
  return messages.map(message => `${message.from === "user" ? "User" : "Baltz AI"}: ${message.text}`).join("\n");
}

export function progressChatReply(text: string, role: Role) {
  const query = text.toLowerCase();
  if (query.includes("audit")) return "I can pull the latest audit score, weakest recommendations, and the plan that should be built next.";
  if (query.includes("funnel")) return "I can summarize the active funnel direction, current offer, platform, and what needs review.";
  if (query.includes("task") || query.includes("todo") || query.includes("to-do")) return "I can narrow this to overdue work, blocked tasks, or the next owner that needs a nudge.";
  if (role === "client") return "I’ll check your project status, open decisions, files, and recent studio updates first.";
  if (role === "dev") return "I’ll look across your assigned clients, open to-do’s, approvals, and messages that need a reply.";
  return "I’ll scan clients, audits, funnels, inbox, and escalations so the answer starts from the current workspace.";
}
