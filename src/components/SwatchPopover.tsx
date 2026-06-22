import { useRef, useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, v * 100];
}

function hsvToHex(h: number, s: number, v: number): string {
  const hh = h / 360, ss = s / 100, vv = v / 100;
  const i = Math.floor(hh * 6);
  const f = hh * 6 - i;
  const p = vv * (1 - ss);
  const q = vv * (1 - f * ss);
  const t = vv * (1 - (1 - f) * ss);
  let r: number, g: number, b: number;
  switch (i % 6) {
    case 0: r = vv; g = t; b = p; break;
    case 1: r = q; g = vv; b = p; break;
    case 2: r = p; g = vv; b = t; break;
    case 3: r = p; g = q; b = vv; break;
    case 4: r = t; g = p; b = vv; break;
    default: r = vv; g = p; b = q; break;
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function ColorPicker({ hex, onChange }: { hex: string; onChange: (hex: string) => void }) {
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#CCCCCC";
  const [h, s, v] = hexToHsv(safeHex);
  const areaRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"area" | "hue" | null>(null);
  const hsvRef = useRef({ h, s, v });
  hsvRef.current = { h, s, v };

  const handleAreaMove = useCallback((clientX: number, clientY: number) => {
    const el = areaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ns = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const nv = Math.max(0, Math.min(100, (1 - (clientY - rect.top) / rect.height) * 100));
    onChange(hsvToHex(hsvRef.current.h, ns, nv));
  }, [onChange]);

  const handleHueMove = useCallback((clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nh = Math.max(0, Math.min(360, ((clientX - rect.left) / rect.width) * 360));
    onChange(hsvToHex(nh, hsvRef.current.s, hsvRef.current.v));
  }, [onChange]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (dragging.current === "area") handleAreaMove(e.clientX, e.clientY);
      else if (dragging.current === "hue") handleHueMove(e.clientX);
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [handleAreaMove, handleHueMove]);

  const hueColor = hsvToHex(h, 100, 100);

  return (
    <div className="color-picker">
      <div
        ref={areaRef}
        className="color-picker-area"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}
        onPointerDown={e => { dragging.current = "area"; e.currentTarget.setPointerCapture(e.pointerId); handleAreaMove(e.clientX, e.clientY); }}
      >
        <div className="color-picker-thumb" style={{ left: `${s}%`, top: `${100 - v}%`, backgroundColor: safeHex }} />
      </div>
      <div
        ref={hueRef}
        className="color-picker-hue"
        onPointerDown={e => { dragging.current = "hue"; e.currentTarget.setPointerCapture(e.pointerId); handleHueMove(e.clientX); }}
      >
        <div className="color-picker-hue-thumb" style={{ left: `${(h / 360) * 100}%` }} />
      </div>
    </div>
  );
}

export function SwatchPopover({ title = "Edit swatch", onClose, hex, onHexChange, colorPresets, onPreset, children }: {
  title?: string;
  onClose: () => void;
  hex: string;
  onHexChange: (hex: string) => void;
  colorPresets: string[];
  onPreset: (hex: string) => void;
  children?: React.ReactNode;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const el = popRef.current;
    if (!el) return;
    const row = el.parentElement;
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const popH = el.offsetHeight;
    setPos({
      top: rect.top + rect.height / 2 - popH / 2,
      left: rect.right + 12,
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popRef}
      className="brand-swatch-popover"
      style={pos ? { top: pos.top, left: pos.left } : { visibility: "hidden" as const }}
      onClick={e => e.stopPropagation()}
    >
      <div className="brand-swatch-popover-head">
        <strong>{title}</strong>
        <button type="button" onClick={onClose}><X size={12} /></button>
      </div>
      <ColorPicker hex={hex} onChange={onHexChange} />
      <div className="brand-swatch-presets">
        {colorPresets.map(h => (
          <button key={h} type="button" aria-label={`Use ${h}`} style={{ backgroundColor: h }} onClick={() => onPreset(h)} />
        ))}
      </div>
      <label>
        <span>Hex</span>
        <input value={hex} onChange={e => onHexChange(e.target.value)} />
      </label>
      {children}
    </div>
  );
}
