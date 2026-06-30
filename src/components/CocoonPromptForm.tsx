import { Check } from "lucide-react";

export type CocoonPrompt = {
  id: string;
  label: string;
  prompt: string;
  type: string;
  kind: "text" | "textarea" | "url" | "checklist";
  placeholder?: string;
  required?: boolean;
  options?: string[];
};

export type CocoonPromptValue = string | string[] | undefined;

export function CocoonPromptForm({
  prompt,
  promptIndex,
  totalPrompts,
  value,
  isFirstPrompt,
  isLastPrompt,
  canUsePrimaryAction,
  isUnsure,
  onTextChange,
  onToggleChecklistValue,
  onPrevious,
  onSubmit,
  onToggleUnsure,
}: {
  prompt: CocoonPrompt;
  promptIndex: number;
  totalPrompts: number;
  value: CocoonPromptValue;
  isFirstPrompt: boolean;
  isLastPrompt: boolean;
  canUsePrimaryAction: boolean;
  isUnsure: boolean;
  onTextChange: (value: string) => void;
  onToggleChecklistValue: (option: string) => void;
  onPrevious: () => void;
  onSubmit: () => void;
  onToggleUnsure: () => void;
}) {
  const selectedOptions = Array.isArray(value) ? value : [];
  const textValue = typeof value === "string" ? value : "";

  return (
    <form className="cocoon-prompt-form" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
      <div className="cocoon-prompt-card" style={{ background: "var(--surface)", borderRadius: "var(--radius-panel)", border: "0", overflow: "hidden" }}>
        <div className="cocoon-prompt-head" style={{ padding: "1.5rem 1.75rem 1rem", borderBottom: "1px solid var(--border-soft)" }}>
          <div className="cocoon-prompt-meta" style={{ fontSize: "var(--text-base)", color: "var(--fg-muted)", marginBottom: "0.65rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span>Question {promptIndex + 1} of {totalPrompts}</span>
            {prompt.required && <><span>·</span><span style={{ color: "var(--accent)", fontWeight: 500 }}>Required</span></>}
          </div>
          <h3 className="cocoon-prompt-title" style={{ fontSize: "var(--text-2xl)", fontWeight: 500, color: "var(--fg)", lineHeight: 1.3, margin: 0 }}>{prompt.prompt}</h3>
          {prompt.label && <div className="cocoon-prompt-subtitle" style={{ fontSize: "var(--text-base)", color: "var(--fg-muted)", marginTop: "0.4rem" }}>{prompt.label} · {prompt.type}</div>}
        </div>
        <div className="cocoon-prompt-body" style={{ padding: "1.25rem 1.75rem" }}>
          {prompt.kind === "checklist" ? (
            <div className="cocoon-checklist-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.45rem" }}>
              {prompt.options?.map(option => {
                const selected = selectedOptions.includes(option);
                return (
                  <label key={option} className="cocoon-checklist-option" style={{ display: "flex", alignItems: "center", gap: "0.8rem", cursor: "pointer", padding: "0.65rem 0.9rem", borderRadius: "var(--radius)", border: `1px solid ${selected ? "oklch(0.78 0.11 22)" : "var(--border)"}`, background: selected ? "oklch(0.78 0.11 22 / 0.06)" : "transparent", transition: "all 0.15s" }}>
                    <input type="checkbox" checked={selected} onChange={() => onToggleChecklistValue(option)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                    <div style={{ width: "1rem", height: "1rem", borderRadius: "50%", flexShrink: 0, border: selected ? "none" : "1.5px solid var(--border)", background: selected ? "oklch(0.55 0.2 20)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {selected && <Check size={7} color="white" strokeWidth={3} />}
                    </div>
                    <span className="cocoon-checklist-option-text" style={{ fontSize: "var(--text-lg)", color: "var(--fg)", fontWeight: selected ? 600 : 400 }}>{option}</span>
                  </label>
                );
              })}
            </div>
          ) : prompt.kind === "textarea" ? (
            <textarea
              value={textValue}
              onChange={e => onTextChange(e.target.value)}
              placeholder={prompt.placeholder}
              className="cocoon-answer-field"
            />
          ) : (
            <input
              value={textValue}
              onChange={e => onTextChange(e.target.value)}
              placeholder={prompt.placeholder}
              type={prompt.kind === "url" ? "url" : "text"}
              className="cocoon-answer-input"
              style={{ width: "100%", padding: "0.85rem 1rem", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "var(--text-lg)", fontFamily: "inherit", color: "var(--fg)", background: "var(--bg)", outline: "none", transition: "border-color 0.15s", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = "oklch(0.78 0.11 22)"}
              onBlur={e => e.target.style.borderColor = "var(--border)"}
            />
          )}
        </div>
      </div>

      <div className="cocoon-prompt-actions" style={{ marginTop: "1rem", display: "flex", alignItems: "center", gap: "0.65rem" }}>
        <button type="button" onClick={onPrevious} disabled={isFirstPrompt}
          className="cocoon-prompt-action"
          style={{ padding: "0.7rem 1.25rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "var(--text-lg)", fontWeight: 500, cursor: isFirstPrompt ? "not-allowed" : "pointer", fontFamily: "inherit", color: "var(--fg-muted)", opacity: isFirstPrompt ? 0.4 : 1, transition: "all 0.15s" }}>
          Previous
        </button>
        <button type="submit" disabled={!canUsePrimaryAction}
          className="cocoon-prompt-action cocoon-prompt-action--primary"
          style={{ padding: "0.7rem 1.4rem", background: "linear-gradient(90deg, oklch(0.78 0.11 22), oklch(0.7 0.13 18))", color: "white", border: "none", borderRadius: "var(--radius)", fontSize: "var(--text-lg)", fontWeight: 500, cursor: canUsePrimaryAction ? "pointer" : "not-allowed", fontFamily: "inherit", opacity: canUsePrimaryAction ? 1 : 0.4, transition: "opacity 0.15s" }}>
          {isLastPrompt ? "Complete step" : "Continue"}
        </button>
        {canUsePrimaryAction && (
          <span className="cocoon-prompt-shortcut" style={{ fontSize: "var(--text-base)", color: "var(--fg-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            Press <kbd style={{ padding: "0.15rem 0.42rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.28rem", fontSize: "var(--text-sm)", fontFamily: "inherit", color: "var(--fg-muted)" }}>⌘</kbd><kbd style={{ padding: "0.15rem 0.42rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.28rem", fontSize: "var(--text-sm)", fontFamily: "inherit", color: "var(--fg-muted)" }}>↵</kbd>
          </span>
        )}
      </div>

      <label className="cocoon-unsure-toggle" style={{ marginTop: "0.85rem", display: "flex", alignItems: "center", gap: "0.55rem", cursor: "pointer", userSelect: "none" }}>
        <input type="checkbox" checked={isUnsure} onChange={onToggleUnsure} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
        <div style={{ width: "0.9rem", height: "0.9rem", borderRadius: "50%", flexShrink: 0, border: isUnsure ? "none" : "1.5px solid var(--fg-muted)", background: isUnsure ? "oklch(0.55 0.2 20)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isUnsure && <Check size={6} color="white" strokeWidth={3} />}
        </div>
        <span style={{ fontSize: "var(--text-md)", color: "var(--fg-muted)" }}>I'm not sure about this yet</span>
      </label>
    </form>
  );
}
