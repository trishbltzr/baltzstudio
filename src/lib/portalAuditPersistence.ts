export type PersistedAuditAnswer = string | string[];
export type PersistedAuditAnswers = Record<string, PersistedAuditAnswer>;

export interface PersistedAuditState {
  clientId: string;
  buildId: string;
  idx: number;
  answers: PersistedAuditAnswers;
  unsure: Record<string, boolean>;
  confirmed: Record<number, boolean>;
  signed: Record<string, boolean>;
  notes: Record<string, string>;
  genDone: Record<string, boolean>;
}

export interface PersistedAuditRun {
  id: string;
  clientId: string;
  clientName: string;
  owner: string;
  subtitle: string;
  runLabel?: string;
  runType?: "baseline" | "rerun";
  sequence?: number;
  baselineRunId?: string;
  statusLabel: string;
  statusTone: "muted" | "warn" | "success" | "accent" | "danger";
  stage: string;
  progress: number;
  score?: number;
  previousScore?: number;
  targetScore?: number;
  due: string;
  createdAt?: string;
  completedAt?: string;
  updatedAt?: string;
}

export interface PersistedAuditDraft {
  run: PersistedAuditRun;
  state: PersistedAuditState;
  updatedAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function coerceStringRecord(value: unknown) {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => typeof entryValue === "string"),
  ) as Record<string, string>;
}

function coerceBooleanRecord(value: unknown) {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => typeof entryValue === "boolean"),
  ) as Record<string, boolean>;
}

function coerceAnswers(value: unknown) {
  if (!isRecord(value)) return {};

  const entries: Array<[string, PersistedAuditAnswer]> = [];

  Object.entries(value).forEach(([key, entryValue]) => {
    if (typeof entryValue === "string") {
      entries.push([key, entryValue]);
      return;
    }

    if (Array.isArray(entryValue) && entryValue.every(item => typeof item === "string")) {
      entries.push([key, entryValue]);
    }
  });

  return Object.fromEntries(entries) as PersistedAuditAnswers;
}

function normalizePersistedAuditState(value: unknown, run: PersistedAuditRun): PersistedAuditState | null {
  if (!isRecord(value)) return null;

  const idx = typeof value.idx === "number" && Number.isFinite(value.idx) && value.idx >= 0
    ? Math.floor(value.idx)
    : null;

  if (idx === null) return null;

  return {
    clientId: run.clientId,
    buildId: run.id,
    idx,
    answers: coerceAnswers(value.answers),
    unsure: coerceBooleanRecord(value.unsure),
    confirmed: coerceBooleanRecord(value.confirmed) as Record<number, boolean>,
    signed: coerceBooleanRecord(value.signed),
    notes: coerceStringRecord(value.notes),
    genDone: coerceBooleanRecord(value.genDone),
  };
}

function normalizePersistedAuditRun(value: unknown): PersistedAuditRun | null {
  if (!isRecord(value)) return null;

  const id = typeof value.id === "string" ? value.id : null;
  const clientId = typeof value.clientId === "string" ? value.clientId : null;
  const clientName = typeof value.clientName === "string" ? value.clientName : null;
  const owner = typeof value.owner === "string" ? value.owner : null;
  const subtitle = typeof value.subtitle === "string" ? value.subtitle : null;
  const runLabel = typeof value.runLabel === "string" ? value.runLabel : undefined;
  const runType = value.runType === "baseline" || value.runType === "rerun" ? value.runType : undefined;
  const sequence = typeof value.sequence === "number" && Number.isFinite(value.sequence) ? Math.max(1, Math.floor(value.sequence)) : undefined;
  const baselineRunId = typeof value.baselineRunId === "string" ? value.baselineRunId : undefined;
  const statusLabel = typeof value.statusLabel === "string" ? value.statusLabel : null;
  const statusTone = ["muted", "warn", "success", "accent", "danger"].includes(String(value.statusTone))
    ? String(value.statusTone) as PersistedAuditRun["statusTone"]
    : null;
  const stage = typeof value.stage === "string" ? value.stage : null;
  const progress = typeof value.progress === "number" && Number.isFinite(value.progress) ? value.progress : null;
  const score = typeof value.score === "number" && Number.isFinite(value.score) ? Math.max(0, Math.min(100, Math.round(value.score))) : undefined;
  const previousScore = typeof value.previousScore === "number" && Number.isFinite(value.previousScore) ? Math.max(0, Math.min(100, Math.round(value.previousScore))) : undefined;
  const targetScore = typeof value.targetScore === "number" && Number.isFinite(value.targetScore) ? Math.max(0, Math.min(100, Math.round(value.targetScore))) : undefined;
  const due = typeof value.due === "string" ? value.due : null;
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : undefined;
  const completedAt = typeof value.completedAt === "string" ? value.completedAt : undefined;
  const updatedAt = typeof value.updatedAt === "string" ? value.updatedAt : undefined;

  if (
    !id
    || !clientId
    || !clientName
    || !owner
    || !subtitle
    || !statusLabel
    || !stage
    || progress === null
    || !due
    || !statusTone
  ) {
    return null;
  }

  return {
    id,
    clientId,
    clientName,
    owner,
    subtitle,
    runLabel,
    runType,
    sequence,
    baselineRunId,
    statusLabel,
    statusTone,
    stage,
    progress: Math.max(0, Math.min(100, Math.round(progress))),
    score,
    previousScore,
    targetScore,
    due,
    createdAt,
    completedAt,
    updatedAt,
  };
}

export function normalizePersistedAuditDraft(value: unknown): PersistedAuditDraft | null {
  if (!isRecord(value)) return null;

  const run = normalizePersistedAuditRun(value.run);
  if (!run) return null;

  const state = normalizePersistedAuditState(value.state, run);
  if (!state) return null;

  return {
    run,
    state,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  };
}

export function coercePersistedAuditDrafts(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map(entry => normalizePersistedAuditDraft(entry))
    .filter((entry): entry is PersistedAuditDraft => !!entry);
}
