import type { ProgressChatMessage } from "./types";

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
