import type { AiGenerationMode } from "./aiStageGeneration";

const API_KEYS_BY_MODE: Record<AiGenerationMode, readonly string[]> = {
  audit: ["OPENAI_WEB-AUDIT_API_KEY", "OPENAI_AUDIT_API_KEY", "OPENAI_API_KEY"],
  brand: ["OPENAI_BRAND-AUDIT_API_KEY", "OPENAI_BRAND_AUDIT_API_KEY", "OPENAI_API_KEY"],
  seo: ["OPENAI_SEO-AUDIT_API_KEY", "OPENAI_AUDIT_API_KEY", "OPENAI_API_KEY"],
  website_builder: ["OPENAI_WEB-BUILDER_API_KEY", "OPENAI_WEBSITE-BUILDER_API_KEY", "OPENAI_WEBSITE_BUILDER_API_KEY", "OPENAI_API_KEY", "OPENAI_CHAT_API_KEY"],
  funnel: ["OPENAI_FUNNEL-BUILDER_API_KEY", "OPENAI_FUNNEL_API_KEY", "OPENAI_API_KEY"],
};

export function apiKeyForMode(mode: AiGenerationMode) {
  return apiKeysForMode(mode)[0];
}

export function apiKeysForMode(mode: AiGenerationMode) {
  return [...new Set(API_KEYS_BY_MODE[mode].map(name => process.env[name]?.trim()).filter((value): value is string => !!value))];
}

export function socialMediaApiKey() {
  return readEnv("OPENAI_SOCIAL-MEDIA-BUILDER_API_KEY", "OPENAI_API_KEY");
}

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export async function createOpenAIResponse(apiKey: string, body: Record<string, unknown>) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);
  return { response, payload };
}

export async function createOpenAIResponseForMode(mode: AiGenerationMode, body: Record<string, unknown>) {
  const apiKeys = apiKeysForMode(mode);
  if (!apiKeys.length) throw new Error(`AI generation is not configured for ${mode}.`);

  let result = await createOpenAIResponse(apiKeys[0], body);
  for (let index = 1; index < apiKeys.length && (result.response.status === 401 || result.response.status === 403); index += 1) {
    result = await createOpenAIResponse(apiKeys[index], body);
  }
  return result;
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
