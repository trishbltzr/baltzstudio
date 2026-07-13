import type { AiGenerationMode } from "./aiStageGeneration";

export function apiKeyForMode(mode: AiGenerationMode) {
  return mode === "funnel"
    ? process.env.OPENAI_FUNNEL_API_KEY || process.env.OPENAI_API_KEY
    : process.env.OPENAI_AUDIT_API_KEY || process.env.OPENAI_API_KEY;
}

export function responseText(payload: any): string {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text;
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "refusal" && typeof content.refusal === "string") throw new Error(content.refusal);
      if (content?.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new Error("The model returned no usable output.");
}

export function openAIError(status: number, payload: any, fallback: string) {
  const quotaUnavailable = status === 429
    && (payload?.error?.code === "insufficient_quota" || payload?.error?.type === "insufficient_quota");
  if (quotaUnavailable) return { status: 503, message: "OpenAI API credits are unavailable for this feature. Add billing or credits, then try again." };
  if (status === 429) return { status: 429, message: "OpenAI is receiving too many requests. Please wait a moment and try again." };
  return {
    status: status >= 500 ? 502 : status,
    message: typeof payload?.error?.message === "string" ? payload.error.message : fallback,
  };
}
