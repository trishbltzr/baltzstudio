import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Btn } from "./shared";

// ─────────────────────────────────────────────
// DEADLINE DATE-RANGE PICKER — preset sidebar + dual-month calendar,
// styled to match the dashboard's salmon/rose accent system.
// ─────────────────────────────────────────────
export type DateRange = { from?: string; to?: string };

const DR_WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DR_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DR_BAND = "oklch(0.66 0.13 18 / 0.14)";

function drPad(n: number) { return String(n).padStart(2, "0"); }
function drToISO(d: Date) { return `${d.getFullYear()}-${drPad(d.getMonth() + 1)}-${drPad(d.getDate())}`; }
function drFromISO(s?: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}
function drFmt(s?: string) {
  const d = drFromISO(s);
  return d ? `${drPad(d.getMonth() + 1)} / ${drPad(d.getDate())} / ${d.getFullYear()}` : "";
}
function drAddDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function drAddMonths(d: Date, n: number) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
function drStartOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function drSameDay(a?: Date, b?: Date) {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DR_PRESETS: { label: string; range: () => DateRange }[] = [
  { label: "Today", range: () => { const t = new Date(); return { from: drToISO(t), to: drToISO(t) }; } },
  { label: "Yesterday", range: () => { const t = drAddDays(new Date(), -1); return { from: drToISO(t), to: drToISO(t) }; } },
  { label: "Last 7 days", range: () => ({ from: drToISO(drAddDays(new Date(), -6)), to: drToISO(new Date()) }) },
  { label: "Last 30 days", range: () => ({ from: drToISO(drAddDays(new Date(), -29)), to: drToISO(new Date()) }) },
  { label: "Last 2 months", range: () => ({ from: drToISO(drAddMonths(new Date(), -2)), to: drToISO(new Date()) }) },
  { label: "Last 3 months", range: () => ({ from: drToISO(drAddMonths(new Date(), -3)), to: drToISO(new Date()) }) },
  { label: "Last 6 months", range: () => ({ from: drToISO(drAddMonths(new Date(), -6)), to: drToISO(new Date()) }) },
  { label: "Last 12 months", range: () => ({ from: drToISO(drAddMonths(new Date(), -12)), to: drToISO(new Date()) }) },
];

function drMatchesPreset(range: DateRange, preset: { range: () => DateRange }) {
  if (!range.from || !range.to) return false;
  const p = preset.range();
  return range.from === p.from && range.to === p.to;
}

function DateRangeMonth({ month, from, to, hover, onHover, onPick, hideTitle }: {
  month: Date;
  from?: Date;
  to?: Date;
  hover?: Date;
  onHover: (d?: Date) => void;
  onPick: (d: Date) => void;
  hideTitle?: boolean;
}) {
  const year = month.getFullYear();
  const m = month.getMonth();
  const firstWeekday = new Date(year, m, 1).getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const daysInPrev = new Date(year, m, 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = firstWeekday - 1; i >= 0; i--) cells.push({ date: new Date(year, m - 1, daysInPrev - i), inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, m, d), inMonth: true });
  while (cells.length < 42) {
    const last = cells[cells.length - 1]!.date;
    cells.push({ date: drAddDays(last, 1), inMonth: false });
  }

  // While picking the second date, preview the range against the hovered day
  const previewTo = !to && from && hover && hover >= from ? hover : undefined;
  const previewFrom = !to && from && hover && hover < from ? hover : undefined;
  const effFrom = previewFrom ?? from;
  const effTo = to ?? previewTo ?? (previewFrom ? from : undefined);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {!hideTitle && (
        <div style={{ textAlign: "center", fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)", marginBottom: "0.6rem" }}>
          {DR_MONTHS[m]} {year}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "0.15rem" }}>
        {DR_WEEKDAYS.map(w => (
          <div key={w} style={{ textAlign: "center", fontSize: "var(--text-2xs)", color: "var(--fg-muted)", fontWeight: 500, padding: "0.2rem 0" }}>{w}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }} onMouseLeave={() => onHover(undefined)}>
        {cells.map(({ date, inMonth }, i) => {
          const isFrom = drSameDay(date, effFrom);
          const isTo = drSameDay(date, effTo);
          const inRange = !!effFrom && !!effTo && date > effFrom && date < effTo;
          const isRowStart = i % 7 === 0;
          const isRowEnd = i % 7 === 6;
          const showBand = (isFrom || isTo || inRange) && !!effFrom && !!effTo && !drSameDay(effFrom, effTo);
          const radiusL = isFrom || isRowStart ? "999px" : "0";
          const radiusR = isTo || isRowEnd ? "999px" : "0";
          return (
            <div key={i} style={{ position: "relative", padding: "1px 0" }}>
              {showBand && (
                <div style={{
                  position: "absolute", inset: "3px 0", background: DR_BAND, pointerEvents: "none",
                  borderTopLeftRadius: radiusL, borderBottomLeftRadius: radiusL,
                  borderTopRightRadius: radiusR, borderBottomRightRadius: radiusR,
                }} />
              )}
              <button
                type="button"
                onMouseEnter={() => onHover(date)}
                onClick={() => onPick(date)}
                style={{
                  position: "relative", zIndex: 1,
                  width: "100%", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                  border: "none", borderRadius: "50%", cursor: "pointer",
                  fontSize: "var(--text-sm)", fontFamily: "inherit",
                  fontWeight: isFrom || isTo ? 600 : 400,
                  background: isFrom || isTo ? "var(--accent)" : "transparent",
                  color: isFrom || isTo ? "white" : inMonth ? "var(--fg)" : "var(--fg-muted)",
                  opacity: inMonth ? 1 : 0.4,
                  transition: "background 0.1s, color 0.1s",
                }}
                onMouseOver={e => { if (!isFrom && !isTo) e.currentTarget.style.background = "var(--surface-alt)"; }}
                onMouseOut={e => { if (!isFrom && !isTo) e.currentTarget.style.background = "transparent"; }}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DR_PILL_BG = "oklch(0.95 0.045 18)";
const DR_PILL_FG = "oklch(0.5 0.13 18)";

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const [hover, setHover] = useState<Date | undefined>(undefined);
  const [viewMonth, setViewMonth] = useState<Date>(() => drStartOfMonth(drFromISO(value.from) ?? new Date()));
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const presetRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    const tr = triggerRef.current?.getBoundingClientRect();
    if (!tr) return;
    const margin = 12;
    const pr = panelRef.current?.getBoundingClientRect();
    const w = pr?.width ?? 320;   // estimate before first measured render
    const h = pr?.height ?? 460;
    let left = tr.left;
    let top = tr.bottom + 8;
    if (left + w > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - w - margin);
    if (top + h > window.innerHeight - margin) top = Math.max(margin, tr.top - h - 8);
    setCoords({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setHover(undefined);
    setPresetOpen(false);
    setViewMonth(drStartOfMonth(drFromISO(value.from) ?? new Date()));
    reposition();
    // Re-measure once the panel has actually mounted at full size, then snap to the real position.
    const id = requestAnimationFrame(() => reposition());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => reposition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  // Collapse the preset dropdown when clicking elsewhere inside the panel
  useEffect(() => {
    if (!open || !presetOpen) return;
    const fn = (e: MouseEvent) => { if (!presetRef.current?.contains(e.target as Node)) setPresetOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open, presetOpen]);

  const draftFrom = drFromISO(draft.from);
  const draftTo = drFromISO(draft.to);
  const activePreset = DR_PRESETS.find(p => drMatchesPreset(draft, p));
  const presetLabel = activePreset?.label ?? (draft.from || draft.to ? "Custom" : "Select a range");

  const handlePick = (date: Date) => {
    if (!draftFrom || draftTo) {
      setDraft({ from: drToISO(date), to: undefined });
    } else if (date < draftFrom) {
      setDraft({ from: drToISO(date), to: drToISO(draftFrom) });
    } else {
      setDraft({ from: drToISO(draftFrom), to: drToISO(date) });
    }
  };

  const presetItemStyle = (active: boolean): React.CSSProperties => ({
    textAlign: "left", border: "none", background: active ? "var(--surface-alt)" : "transparent",
    color: active ? "var(--accent)" : "var(--fg-muted)", fontWeight: active ? 600 : 400,
    fontSize: "var(--text-base)", fontFamily: "inherit", padding: "0.4rem 0.6rem", borderRadius: "0.5rem",
    cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem", width: "100%",
  });

  const navBtnStyle: React.CSSProperties = {
    border: "1px solid var(--border)", background: "var(--surface)", borderRadius: "999px",
    width: "1.6rem", height: "1.6rem", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "var(--fg-muted)", flexShrink: 0,
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.45rem",
          border: "none", background: "transparent", padding: "0.2rem 0",
          fontFamily: "inherit", cursor: "pointer",
        }}
      >
        <CalendarDays size={13} style={{ color: "var(--fg-muted)", flexShrink: 0 }} />
        {value.from || value.to
          ? <span style={{
              display: "inline-flex", alignItems: "center", gap: "0.3rem",
              padding: "0.3rem 0.65rem", borderRadius: "999px",
              background: DR_PILL_BG, color: DR_PILL_FG, fontSize: "var(--text-sm)", fontWeight: 500,
            }}>
              {drFmt(value.from) || "—"} <span style={{ opacity: 0.55 }}>→</span> {drFmt(value.to) || "—"}
            </span>
          : <span style={{ color: "var(--fg-muted)", fontSize: "var(--text-base)", fontWeight: 400 }}>Set deadline range…</span>}
      </button>

      {open && coords && createPortal(
        <div
          ref={panelRef}
          style={{
            position: "fixed", top: `${coords.top}px`, left: `${coords.left}px`, zIndex: 2000,
            width: "286px", display: "flex", flexDirection: "column",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "1rem", boxShadow: "var(--shadow-popover)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "0.85rem 0.9rem 0" }}>
            {/* Collapsible preset dropdown */}
            <div ref={presetRef} style={{ position: "relative", marginBottom: "0.7rem" }}>
              <button
                type="button"
                onClick={() => setPresetOpen(v => !v)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                  padding: "0.4rem 0.65rem", borderRadius: "0.6rem",
                  border: "1px solid var(--border)", background: "var(--surface)",
                  color: "var(--fg)", fontSize: "var(--text-base)", fontFamily: "inherit", fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {presetLabel}
                <ChevronDown size={14} style={{ color: "var(--fg-muted)", transition: "transform 0.15s", transform: presetOpen ? "rotate(180deg)" : "none" }} />
              </button>
              {presetOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 0.3rem)", left: 0, right: 0, zIndex: 5,
                  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem",
                  boxShadow: "var(--shadow-popover)",
                  padding: "0.4rem", display: "flex", flexDirection: "column", gap: "0.05rem",
                  maxHeight: "236px", overflowY: "auto",
                }}>
                  {DR_PRESETS.map(p => {
                    const active = drMatchesPreset(draft, p);
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          const r = p.range();
                          setDraft(r);
                          setViewMonth(drStartOfMonth(drFromISO(r.to) ?? new Date()));
                          setPresetOpen(false);
                        }}
                        style={presetItemStyle(active)}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--surface-alt)"; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                      >
                        {active && <Check size={11} />}
                        {p.label}
                      </button>
                    );
                  })}
                  <div style={{ height: "1px", background: "var(--border)", margin: "0.3rem 0.4rem" }} />
                  <div style={presetItemStyle(!activePreset && !!(draft.from || draft.to))}>
                    {!activePreset && !!(draft.from || draft.to) && <Check size={11} />}
                    Custom (pick dates below)
                  </div>
                </div>
              )}
            </div>

            {/* From / To display pills */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.8rem" }}>
              <div style={{ flex: 1, padding: "0.35rem 0.5rem", borderRadius: "0.6rem", border: "1px solid var(--border)", fontSize: "var(--text-xs)", color: draft.from ? "var(--fg)" : "var(--fg-muted)", fontWeight: 500, textAlign: "center" }}>
                {drFmt(draft.from) || "MM / DD / YYYY"}
              </div>
              <span style={{ color: "var(--fg-muted)", fontSize: "var(--text-sm)", flexShrink: 0 }}>→</span>
              <div style={{ flex: 1, padding: "0.35rem 0.5rem", borderRadius: "0.6rem", border: "1px solid var(--border)", fontSize: "var(--text-xs)", color: draft.to ? "var(--fg)" : "var(--fg-muted)", fontWeight: 500, textAlign: "center" }}>
                {drFmt(draft.to) || "MM / DD / YYYY"}
              </div>
            </div>

            {/* Single-month calendar with nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <button type="button" onClick={() => setViewMonth(m => drAddMonths(m, -1))} style={navBtnStyle}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ fontSize: "var(--text-base)", fontWeight: 500, color: "var(--fg)" }}>
                {DR_MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </span>
              <button type="button" onClick={() => setViewMonth(m => drAddMonths(m, 1))} style={navBtnStyle}>
                <ChevronRight size={14} />
              </button>
            </div>
            <DateRangeMonth month={viewMonth} from={draftFrom} to={draftTo} hover={hover} onHover={setHover} onPick={handlePick} hideTitle />
          </div>

          {/* Footer actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", margin: "0.7rem 0.9rem 0.85rem", paddingTop: "0.7rem", borderTop: "1px solid var(--border)" }}>
            <Btn variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Btn>
            <Btn variant="primary" size="sm" disabled={!draft.from} onClick={() => { onChange(draft); setOpen(false); }}>Apply</Btn>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
