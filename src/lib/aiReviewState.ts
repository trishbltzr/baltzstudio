export const AI_REVIEW_STATE_ORDER = ["not_generated", "draft", "needs_review", "approved", "shared"] as const;

export type AiReviewState = typeof AI_REVIEW_STATE_ORDER[number];

export type AiReviewTone = "muted" | "warn" | "accent" | "success";

export interface AiReviewStateMeta {
  label: "Not generated" | "Draft" | "Needs review" | "Approved" | "Shared";
  tone: AiReviewTone;
}

export const AI_REVIEW_STATE_META: Record<AiReviewState, AiReviewStateMeta> = {
  not_generated: { label: "Not generated", tone: "muted" },
  draft: { label: "Draft", tone: "warn" },
  needs_review: { label: "Needs review", tone: "accent" },
  approved: { label: "Approved", tone: "success" },
  shared: { label: "Shared", tone: "success" },
};

export function isAiReviewState(value: unknown): value is AiReviewState {
  return typeof value === "string" && AI_REVIEW_STATE_ORDER.includes(value as AiReviewState);
}

export function deriveAiReviewState(input: {
  generated?: boolean;
  approved?: boolean;
  shared?: boolean;
  drafting?: boolean;
  explicit?: unknown;
}): AiReviewState {
  const explicit = isAiReviewState(input.explicit) ? input.explicit : undefined;
  if (input.shared || explicit === "shared") return "shared";
  if (input.approved || explicit === "approved") return "approved";
  if (input.drafting) return "draft";
  if (input.generated) return "needs_review";
  if (explicit === "draft" || explicit === "needs_review") return explicit;
  return "not_generated";
}

export function normalizeAiReviewStates(
  value: unknown,
  generatedKeys: string[] = [],
  approved: Record<string, boolean> = {},
): Record<string, AiReviewState> {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const keys = new Set([...Object.keys(source), ...generatedKeys, ...Object.keys(approved)]);
  return Object.fromEntries([...keys].map(key => [key, deriveAiReviewState({
    explicit: source[key],
    generated: generatedKeys.includes(key),
    approved: approved[key] === true,
  })]));
}

export function aiReviewMeta(state: AiReviewState): AiReviewStateMeta {
  return AI_REVIEW_STATE_META[state];
}

export function canTransitionAiReviewState(from: AiReviewState, to: AiReviewState): boolean {
  if (from === to) return true;
  if (from === "needs_review" && to === "draft") return true;
  return AI_REVIEW_STATE_ORDER.indexOf(to) === AI_REVIEW_STATE_ORDER.indexOf(from) + 1;
}

export function transitionAiReviewState(from: AiReviewState | undefined, to: AiReviewState): AiReviewState {
  const current = from || "not_generated";
  return canTransitionAiReviewState(current, to) ? to : current;
}
