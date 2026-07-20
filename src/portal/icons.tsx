"use client";

import { createElement, type ReactElement } from "react";

// Ported verbatim from the Baltz Studio Portal design prototype (icon() path
// dictionary). Each entry is a list of [svgTag, attrs] pairs rendered inside a
// stroke-based 24×24 viewBox so glyphs match the design pixel-for-pixel.
type Prim = [string, Record<string, string | number>];

const P: Record<string, Prim[]> = {
  grid: [["path", { d: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" }]],
  folder: [["path", { d: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }]],
  check: [["rect", { x: 3, y: 3, width: 18, height: 18, rx: 4 }], ["path", { d: "M8 12l2.5 2.5L16 9" }]],
  inbox: [["path", { d: "M3 12l3-7h12l3 7v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }], ["path", { d: "M3 12h5l1.5 3h5L16 12h5" }]],
  file: [["path", { d: "M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" }], ["path", { d: "M14 3v5h5" }]],
  users: [["circle", { cx: 9, cy: 8, r: 3 }], ["path", { d: "M4 20c0-3 2.2-5 5-5s5 2 5 5" }], ["path", { d: "M16 5.5a3 3 0 0 1 0 6" }], ["path", { d: "M18.5 20c0-2-1-3.6-2.6-4.4" }]],
  card: [["rect", { x: 3, y: 5, width: 18, height: 14, rx: 2 }], ["path", { d: "M3 10h18" }]],
  settings: [["circle", { cx: 12, cy: 12, r: 3 }], ["path", { d: "M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" }]],
  flag: [["path", { d: "M5 21V4" }], ["path", { d: "M5 4h12l-1.5 3.5L17 11H5" }]],
  clip: [["path", { d: "M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" }]],
  target: [["circle", { cx: 12, cy: 12, r: 8 }], ["circle", { cx: 12, cy: 12, r: 3.5 }]],
  thumbs: [["path", { d: "M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" }], ["path", { d: "M7 11l3.6-7.2A1.8 1.8 0 0 1 13 5v3h5.2a2 2 0 0 1 2 2.4l-1.2 6A2 2 0 0 1 17 20H7" }]],
  life: [["circle", { cx: 12, cy: 12, r: 9 }], ["circle", { cx: 12, cy: 12, r: 3.5 }], ["path", { d: "M5.6 5.6l3.2 3.2M15.2 15.2l3.2 3.2M18.4 5.6l-3.2 3.2M8.8 15.2l-3.2 3.2" }]],
  bell: [["path", { d: "M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" }], ["path", { d: "M10 20a2 2 0 0 0 4 0" }]],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  arrow: [["path", { d: "M7 17L17 7M8 7h9v9" }]],
  lock: [["rect", { x: 5, y: 11, width: 14, height: 9, rx: 2 }], ["path", { d: "M8 11V8a4 4 0 0 1 8 0v3" }]],
  send: [["path", { d: "M22 2L11 13M22 2l-7 20-4-9-9-4z" }]],
  arrowup: [["path", { d: "M12 20V5M6 11l6-6 6 6" }]],
  cal: [["rect", { x: 4, y: 5, width: 16, height: 16, rx: 2 }], ["path", { d: "M4 10h16M9 3v4M15 3v4" }]],
  alert: [["path", { d: "M12 4l9 16H3z" }], ["path", { d: "M12 10v4M12 17v.01" }]],
  checkmark: [["path", { d: "M5 12l4 4 10-11" }]],
  menu: [["path", { d: "M4 7h16M4 12h16M4 17h16" }]],
  panel: [["rect", { x: 3, y: 4, width: 18, height: 16, rx: 3 }], ["path", { d: "M8 4v16" }]],
  panelleft: [["rect", { x: 3, y: 4, width: 18, height: 16, rx: 3 }], ["path", { d: "M8 4v16" }]],
  panelright: [["rect", { x: 3, y: 4, width: 18, height: 16, rx: 3 }], ["path", { d: "M16 4v16" }]],
  clock: [["circle", { cx: 12, cy: 12, r: 9 }], ["path", { d: "M12 7v5l3 2" }]],
  msg: [["path", { d: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 4V6a1 1 0 0 1 1-1z" }]],
  shield: [["path", { d: "M12 3l8 3v6c0 4.5-3.2 7.5-8 9-4.8-1.5-8-4.5-8-9V6z" }]],
  chev: [["path", { d: "M6 9l6 6 6-6" }]],
  chevleft: [["path", { d: "M15 6l-6 6 6 6" }]],
  chevright: [["path", { d: "M9 6l6 6-6 6" }]],
  eye: [["path", { d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" }], ["circle", { cx: 12, cy: 12, r: 3 }]],
  palette: [["path", { d: "M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2 0-1.2 1-2 2.2-2H18a3 3 0 0 0 3-3c0-5-4-9-9-9z" }], ["circle", { cx: 7.5, cy: 11, r: 1.1 }], ["circle", { cx: 12, cy: 8, r: 1.1 }], ["circle", { cx: 16, cy: 11, r: 1.1 }]],
  x: [["path", { d: "M6 6l12 12M18 6L6 18" }]],
  minus: [["path", { d: "M5 12h14" }]],
  search: [["circle", { cx: 11, cy: 11, r: 6 }], ["path", { d: "M20 20l-3.6-3.6" }]],
  sparkle: [["path", { d: "M12 3l1.7 5.1L19 10l-5.3 1.9L12 17l-1.7-5.1L5 10l5.3-1.9z" }], ["path", { d: "M18.5 14.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" }]],
  wallet: [["path", { d: "M3 8a2 2 0 0 1 2-2h12a1 1 0 0 1 1 1v1" }], ["rect", { x: 3, y: 8, width: 18, height: 12, rx: 2 }], ["circle", { cx: 16.5, cy: 14, r: 1.3 }]],
  activity: [["path", { d: "M3 12h4l2.5 7 4-15L16 12h5" }]],
  feather: [["path", { d: "M20 4C11 4 6 10 5 19" }], ["path", { d: "M20 4c.5 7-4 12-11 13H5.5" }], ["path", { d: "M8.5 15H16" }]],
  replay: [["path", { d: "M20 11a8 8 0 0 0-14-4.7" }], ["path", { d: "M5.5 3.8v4.7H10" }], ["path", { d: "M4 13a8 8 0 0 0 14 4.7" }], ["path", { d: "M18.5 20.2v-4.7H14" }]],
  link: [["path", { d: "M10.6 13.4a4.5 4.5 0 0 0 6.4.1l2-2a4.5 4.5 0 0 0-6.4-6.4l-1.1 1.1" }], ["path", { d: "M13.4 10.6a4.5 4.5 0 0 0-6.4-.1l-2 2a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1" }]],
  edit: [["path", { d: "M4 20h4L18.5 9.5a2 2 0 0 0-2.8-2.8L5 17z" }], ["path", { d: "M13.5 6.5l4 4" }]],
  user: [["circle", { cx: 12, cy: 8, r: 3.4 }], ["path", { d: "M5.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" }]],
  logout: [["path", { d: "M14 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h8" }], ["path", { d: "M15 12H9" }], ["path", { d: "M17 8l4 4-4 4" }]],
  sliders: [["path", { d: "M4 7h9M19 7h1" }], ["circle", { cx: 16, cy: 7, r: 2.1 }], ["path", { d: "M4 12h3M13 12h7" }], ["circle", { cx: 10, cy: 12, r: 2.1 }], ["path", { d: "M4 17h9M19 17h1" }], ["circle", { cx: 16, cy: 17, r: 2.1 }]],
  history: [["path", { d: "M3.5 9a9 9 0 1 1-1 5" }], ["path", { d: "M3 4.5V9h4.5" }], ["path", { d: "M12 8.5V12l2.8 1.6" }]],
  chart: [["path", { d: "M4 4v15a1 1 0 0 0 1 1h15" }], ["path", { d: "M8.5 16v-3.5" }], ["path", { d: "M13 16V9" }], ["path", { d: "M17.5 16v-5.5" }]],
  map: [["path", { d: "M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2z" }], ["path", { d: "M9 4v14M15 6v14" }]],
  snapshot: [["rect", { x: 4, y: 5, width: 16, height: 14, rx: 3 }], ["path", { d: "M8 14l2.4-2.4 2.4 2.4 3.2-4" }], ["path", { d: "M8 9h.01M7 19l-2 2M17 19l2 2" }]],
  audit: [["rect", { x: 5, y: 4, width: 14, height: 17, rx: 3 }], ["path", { d: "M9 4.5h6" }], ["path", { d: "M8.5 10.5l1.5 1.5 3-3" }], ["path", { d: "M8.5 16h7" }]],
  timeline: [["path", { d: "M12 5v14" }], ["circle", { cx: 12, cy: 6, r: 2 }], ["circle", { cx: 12, cy: 12, r: 2 }], ["circle", { cx: 12, cy: 18, r: 2 }], ["path", { d: "M14 6h5M5 12h5M14 18h5" }]],
  checklist: [["path", { d: "M10 6h10M10 12h10M10 18h10" }], ["path", { d: "M4 6.2l1.3 1.3L7.8 5" }], ["path", { d: "M4 12.2l1.3 1.3L7.8 11" }], ["path", { d: "M4 18.2l1.3 1.3L7.8 17" }]],
  briefcase: [["rect", { x: 3, y: 7.5, width: 18, height: 12.5, rx: 2 }], ["path", { d: "M8.5 7.5V5.8A1.8 1.8 0 0 1 10.3 4h3.4a1.8 1.8 0 0 1 1.8 1.8v1.7" }], ["path", { d: "M3 12.5h18" }], ["path", { d: "M11 12.5h2" }]],
  layers: [["path", { d: "M12 3l9 5-9 5-9-5z" }], ["path", { d: "M3 13l9 5 9-5" }]],
  dots: [["circle", { cx: 6, cy: 12, r: 1.35 }], ["circle", { cx: 12, cy: 12, r: 1.35 }], ["circle", { cx: 18, cy: 12, r: 1.35 }]],
  ticket: [["path", { d: "M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" }], ["path", { d: "M14 6v12" }]],
  trash: [["path", { d: "M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" }]],
  hash: [["path", { d: "M9 4L7 20M17 4l-2 16M5 9h15M4 15h15" }]],
  funnel: [["path", { d: "M3 5h18l-7 8.2V20l-4-2.2v-4.6z" }]],
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 18 }: { name: string; size?: number }): ReactElement {
  const kids = (P[name] || []).map((e, i) => createElement(e[0], { key: i, ...e[1] }));
  return createElement(
    "svg",
    { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.85, strokeLinecap: "round", strokeLinejoin: "round" },
    ...kids,
  );
}

export function SidebarToggleIcon({ collapsed, size = 18 }: { collapsed: boolean; size?: number }): ReactElement {
  const ease = "cubic-bezier(.22,1,.36,1)";
  const dividerShift = collapsed ? 1.25 : 5.25;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <g style={{ transform: `translateX(${dividerShift}px)`, transition: `transform .24s ${ease}` }}>
        <path d="M8.75 5.2v13.6" />
      </g>
    </svg>
  );
}
