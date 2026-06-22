import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type MeetingDetails = {
  dateLabel: string;
  startTime: string;
  endTime: string;
  aiNotes: boolean;
};

type TimeRange = { start: Date; end: Date };

// Call length and the rest period the host needs between any two bookings.
// A slot only opens up once it both fits the call and clears the buffer
// around whatever else is already on the calendar that day.
const CALL_DURATION_MINUTES = 40;
const REST_BUFFER_MINUTES = 30;
const SLOT_STEP_MINUTES = 30;
const WORKING_HOURS_START = 9;
const WORKING_HOURS_END = 17;

// Stand-in for the host's existing bookings on a given day. Swap this for a
// real Google Calendar freebusy.query lookup once Calendar is connected.
function getMockBusyRanges(date: Date): TimeRange[] {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const at = (hour: number, minute: number) => new Date(day.getTime() + (hour * 60 + minute) * 60000);
  if (date.getDay() % 2 === 0) {
    return [{ start: at(10, 0), end: at(10, 0 + CALL_DURATION_MINUTES) }];
  }
  return [{ start: at(13, 30), end: at(13, 30 + CALL_DURATION_MINUTES) }];
}

function getAvailableSlots(date: Date, busyRanges: TimeRange[]): TimeRange[] {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayStart = new Date(day.getTime() + WORKING_HOURS_START * 60 * 60000);
  const dayEnd = new Date(day.getTime() + WORKING_HOURS_END * 60 * 60000);

  const slots: TimeRange[] = [];
  for (let t = dayStart.getTime(); t + CALL_DURATION_MINUTES * 60000 <= dayEnd.getTime(); t += SLOT_STEP_MINUTES * 60000) {
    const start = new Date(t);
    const end = new Date(t + CALL_DURATION_MINUTES * 60000);
    const blocked = busyRanges.some(busy => {
      const restStart = new Date(busy.start.getTime() - REST_BUFFER_MINUTES * 60000);
      const restEnd = new Date(busy.end.getTime() + REST_BUFFER_MINUTES * 60000);
      return start < restEnd && end > restStart;
    });
    if (!blocked) slots.push({ start, end });
  }
  return slots;
}

function formatSlotTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(" ", "");
}

export function MeetingScheduler({
  initial,
  onCancel,
  onSchedule,
}: {
  initial: MeetingDetails | null;
  onCancel: () => void;
  onSchedule: (meeting: MeetingDetails) => void;
}) {
  const today = new Date();
  const defaultDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5);
  const [viewDate, setViewDate] = useState(() => new Date(defaultDate.getFullYear(), defaultDate.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [selectedSlot, setSelectedSlot] = useState<TimeRange | null>(null);
  const [aiNotes, setAiNotes] = useState(initial?.aiNotes ?? true);

  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();

  const cells: { date: Date; inMonth: boolean }[] = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(viewDate.getFullYear(), viewDate.getMonth(), d), inMonth: true });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function pickDate(d: Date) {
    setSelectedDate(d);
    setSelectedSlot(null);
  }

  const fmtDay = (d: Date) => d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const slots = useMemo(
    () => getAvailableSlots(selectedDate, getMockBusyRanges(selectedDate)),
    [selectedDate],
  );

  function handleConfirm() {
    if (!selectedSlot) return;
    onSchedule({
      dateLabel: fmtDay(selectedDate),
      startTime: formatSlotTime(selectedSlot.start),
      endTime: formatSlotTime(selectedSlot.end),
      aiNotes,
    });
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Schedule a meeting"
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "oklch(0.2 0.02 30 / 0.45)", padding: "1.5rem" }}
      onClick={onCancel}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: "640px", maxHeight: "calc(100vh - 3rem)", overflowY: "auto", background: "var(--surface)", borderRadius: "1.25rem", boxShadow: "var(--shadow-modal)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "1.5rem 1.75rem 1.1rem" }}>
          <div style={{ width: "2.6rem", height: "2.6rem", borderRadius: "50%", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.5 9.5L19.2 6.6C19.5 6.4 19.9 6.4 20.2 6.6C20.4 6.8 20.5 7 20.5 7.3V16.7C20.5 17 20.4 17.2 20.2 17.4C19.9 17.6 19.5 17.6 19.2 17.4L15.5 14.5V9.5Z" fill="#00832D"/>
              <rect x="3.5" y="6" width="12" height="12" rx="2" fill="#00AC47"/>
              <path d="M3.5 6H9.5V12H3.5V6Z" fill="#2684FC"/>
              <path d="M9.5 6H15.5V12H9.5V6Z" fill="#0066DA"/>
              <path d="M3.5 12H9.5V18H5.5C4.4 18 3.5 17.1 3.5 16V12Z" fill="#00AC47"/>
              <path d="M9.5 12H15.5V18H9.5V12Z" fill="#00832D"/>
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--fg)" }}>Select a Date &amp; Time</h3>
            <p style={{ margin: "0.15rem 0 0", fontSize: "var(--text-base)", color: "var(--fg-muted)" }}>40-minute guided audit call · a {REST_BUFFER_MINUTES}-minute break is held after every booking</p>
          </div>
        </div>
        <div style={{ height: "1px", background: "var(--border)" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 13rem", gap: "1.5rem", padding: "1.5rem 1.75rem" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
              <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} aria-label="Previous month"
                style={{ width: "1.8rem", height: "1.8rem", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: "var(--fg-muted)", cursor: "pointer", borderRadius: "999px" }}>
                <ChevronLeft size={16} />
              </button>
              <div style={{ fontSize: "var(--text-md)", fontWeight: 500, color: "var(--fg)" }}>{monthLabel}</div>
              <button type="button" onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} aria-label="Next month"
                style={{ width: "1.8rem", height: "1.8rem", display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: "var(--fg-muted)", cursor: "pointer", borderRadius: "999px" }}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.2rem", textAlign: "center" }}>
              {weekdayLabels.map(w => (
                <div key={w} style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--fg-muted)", padding: "0.35rem 0" }}>{w}</div>
              ))}
              {cells.map(({ date, inMonth }, i) => {
                const isSelected = sameDay(date, selectedDate);
                return (
                  <button key={i} type="button" onClick={() => pickDate(date)}
                    style={{
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                      padding: "0.5rem 0", fontSize: "var(--text-sm)", fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? "white" : inMonth ? "var(--fg)" : "var(--fg-muted)",
                      opacity: inMonth ? 1 : 0.35,
                      background: isSelected ? "var(--accent)" : "transparent",
                      borderRadius: "999px",
                    }}>
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: "1.1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", cursor: "pointer", userSelect: "none" }}>
                <span style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--fg)" }}>Enable AI notes</span>
                <span onClick={() => setAiNotes(v => !v)} role="switch" aria-checked={aiNotes}
                  style={{ width: "2.4rem", height: "1.4rem", borderRadius: "999px", background: aiNotes ? "var(--accent)" : "var(--border)", position: "relative", transition: "background 0.15s", flexShrink: 0 }}>
                  <span style={{ position: "absolute", top: "0.15rem", left: aiNotes ? "1.15rem" : "0.15rem", width: "1.1rem", height: "1.1rem", borderRadius: "50%", background: "white", boxShadow: "var(--shadow-xs)", transition: "left 0.15s" }} />
                </span>
              </label>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", borderLeft: "1px solid var(--border)", paddingLeft: "1.5rem", minWidth: 0 }}>
            <div style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--fg)" }}>{fmtDay(selectedDate)}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "17rem", overflowY: "auto", paddingRight: "0.2rem" }}>
              {slots.length === 0 && (
                <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)", padding: "0.6rem 0" }}>No times open this day - try another date.</div>
              )}
              {slots.map(slot => {
                const isSelected = selectedSlot?.start.getTime() === slot.start.getTime();
                return (
                  <div key={slot.start.toISOString()} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button type="button" onClick={() => setSelectedSlot(isSelected ? null : slot)}
                      style={{
                        flex: 1, padding: "0.6rem 0.9rem", borderRadius: "var(--radius)", fontSize: "var(--text-sm)", fontWeight: 500, fontFamily: "inherit", cursor: "pointer", textAlign: "center",
                        border: isSelected ? "none" : "1px solid var(--border)",
                        background: isSelected ? "var(--fg)" : "var(--surface)",
                        color: isSelected ? "white" : "var(--accent)",
                        transition: "background 0.12s, color 0.12s",
                      }}>
                      {formatSlotTime(slot.start)}
                    </button>
                    {isSelected && (
                      <button type="button" onClick={handleConfirm}
                        style={{ padding: "0.6rem 1rem", borderRadius: "var(--radius)", fontSize: "var(--text-sm)", fontWeight: 500, fontFamily: "inherit", cursor: "pointer", border: "none", background: "var(--accent)", color: "white", whiteSpace: "nowrap" }}>
                        Confirm
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ height: "1px", background: "var(--border)" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "1.1rem 1.75rem", flexWrap: "wrap" }}>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--fg-muted)" }}>
            {selectedSlot
              ? <>Event: <span style={{ fontWeight: 500, color: "var(--fg)" }}>{fmtDay(selectedDate)}, {formatSlotTime(selectedSlot.start)} - {formatSlotTime(selectedSlot.end)}</span></>
              : "Pick a time to continue"}
          </div>
          <button type="button" onClick={onCancel}
            style={{ padding: "0.6rem 1.2rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "var(--text-sm)", fontWeight: 500, fontFamily: "inherit", color: "var(--fg)", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
