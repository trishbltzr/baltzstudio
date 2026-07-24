"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { clientsVisibleToRole, type StudioClient } from "../clients";
import { GuidedIntakeSelector } from "../components/GuidedIntakeSelector";
import { EngineIndexControls } from "../components/EngineIndexControls";
import { EngineIndexOverview } from "../components/EngineIndexOverview";
import { GuidedLoadingState } from "../components/GuidedLoadingState";
import { isUnassignedEngineClient, saveEngineWork, startClientForEngine } from "../engineLifecycle";
import { css } from "../helpers";
import { Icon } from "../icons";
import { getProcessDefinition } from "../processDefinitions";
import type { PortalActions, PortalState } from "../store";
import { syncPortalProcessRun } from "@/lib/portalProcessRuns";
import { aiReviewMeta, deriveAiReviewState } from "@/lib/aiReviewState";

type Stage = "brief" | "plan" | "calendar" | "schedule";
type ChannelId = "ig" | "tt" | "li" | "fb" | "x" | "pin" | "yt";
type SourceId = "handle" | "posts" | "website" | "brand";
type PostStatus = "draft" | "approved";

interface SocialPost {
  id: string;
  day: number;
  channel: ChannelId;
  crossPostTo?: ChannelId[];
  pillar: string;
  title: string;
  caption: string;
  hashtags: string;
  graphicCopy: string;
  link: string;
  artDirection: string;
  assetName?: string;
  format: string;
  time: string;
  status: PostStatus;
}

interface SocialIdea {
  pillar: string;
  title: string;
  caption: string;
  hashtags: string[];
  graphicCopy: string;
  artDirection: string;
}

interface SocialProject {
  entered: boolean;
  sent: boolean;
  stage: Stage;
  source: SourceId;
  sourceText: string;
  analyzed: boolean;
  voice: string[];
  pillars: string[];
  channels: ChannelId[];
  weeks: 1 | 2 | 4;
  cadence: Record<ChannelId, number>;
  posts: SocialPost[];
  selectedPostId: string | null;
  savedAt: string;
}

interface SocialMonthRecord {
  id: string;
  monthKey: string;
  project: SocialProject;
  createdAt: string;
  updatedAt: string;
}

interface SocialMonthCollection {
  months: SocialMonthRecord[];
}

const CHANNELS: Array<{ id: ChannelId; label: string; color: string }> = [
  { id: "ig", label: "Instagram", color: "#d86478" },
  { id: "tt", label: "TikTok", color: "#302527" },
  { id: "li", label: "LinkedIn", color: "#4d7dac" },
  { id: "fb", label: "Facebook", color: "#617fba" },
  { id: "x", label: "X", color: "#4a4546" },
  { id: "pin", label: "Pinterest", color: "#bc5965" },
  { id: "yt", label: "YouTube", color: "#d95d5e" },
];

const SOURCE_TABS: Array<{ id: SourceId; label: string; placeholder: string }> = [
  { id: "handle", label: "Paste handle", placeholder: "@yourbrand" },
  { id: "posts", label: "Paste posts", placeholder: "Paste a few recent captions here…" },
  { id: "website", label: "Website", placeholder: "https://yourbrand.com" },
  { id: "brand", label: "Brand notes", placeholder: "Paste positioning, audience, offers, and tone notes…" },
];

const ART_FORMATS = [
  { value: "Vertical video", label: "Vertical", ratio: "9:16" },
  { value: "Static image", label: "Square", ratio: "1:1" },
  { value: "Landscape image", label: "Landscape", ratio: "16:9" },
  { value: "Carousel", label: "Carousel", ratio: "1:1" },
];
const STAGES: Array<{ id: Stage; label: string; note: string; icon: string }> = getProcessDefinition("social-media-operations").stages.map(stage => ({
  id: stage.id as Stage,
  label: stage.label,
  note: stage.note || stage.nextAction,
  icon: stage.icon,
}));

const INTRO_STEPS = [
  { num: "1", title: "Jump-start from your posts", tag: "Voice + pillars", icon: "sparkle" },
  { num: "2", title: "Set channels & cadence", tag: "How often", icon: "layers" },
  { num: "3", title: "Approve captions & hashtags", tag: "Per post", icon: "edit" },
  { num: "4", title: "Confirm art format", tag: "9:16 · 1:1 · carousel", icon: "grid" },
  { num: "5", title: "Map onto the calendar", tag: "Ready to ship", icon: "cal" },
];

const inputStyle = "width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:.8rem;background:var(--surface);color:var(--fg);padding:.7rem .78rem;font:inherit;font-size:var(--text-xs);outline:none";
const buttonPrimary = "display:inline-flex;align-items:center;justify-content:center;gap:.4rem;min-height:2.35rem;padding:0 .95rem;border:none;border-radius:999px;background:var(--accent);color:#fff;font-size:var(--text-xs);font-weight:500;cursor:pointer";
const buttonSoft = "display:inline-flex;align-items:center;justify-content:center;gap:.38rem;min-height:2.2rem;padding:0 .82rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);font-weight:500;cursor:pointer";

function blankProject(): SocialProject {
  return {
    entered: false,
    sent: false,
    stage: "brief",
    source: "handle",
    sourceText: "",
    analyzed: false,
    voice: [],
    pillars: [],
    channels: ["ig", "li"],
    weeks: 4,
    cadence: { ig: 3, tt: 2, li: 2, fb: 2, x: 3, pin: 2, yt: 1 },
    posts: [],
    selectedPostId: null,
    savedAt: new Date().toISOString(),
  };
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthKeyAtOffset(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en", { month: "long", year: "numeric" });
}

function normalizeProject(saved?: Partial<SocialProject>): SocialProject {
  const base = blankProject();
  if (!saved) return base;
  const posts = (saved.posts || []).map(post => ({
    ...post,
    crossPostTo: (post.crossPostTo || []).filter(id => id !== post.channel),
  }));
  return {
    ...base,
    ...saved,
    cadence: { ...base.cadence, ...(saved.cadence || {}) },
    posts,
    entered: saved.entered ?? (!!saved.analyzed || !!saved.posts?.length),
    sent: saved.sent ?? false,
  };
}

function monthStorageKey(clientId: string) {
  return `baltazar:social-builder-months:${clientId}`;
}

function legacySocialStorageKey(clientId: string) {
  return `baltazar:social-builder:${clientId}`;
}

function isLegacySeededSocialProject(project: Partial<SocialProject>) {
  const titles = new Set((project.posts || []).map(post => post.title));
  return titles.has("Myth vs fact") && titles.has("A day behind the brand") && titles.has("The product ritual");
}

function newMonthRecord(monthKey: string, project: SocialProject = blankProject()): SocialMonthRecord {
  const now = new Date().toISOString();
  return { id: monthKey, monthKey, project: normalizeProject(project), createdAt: now, updatedAt: now };
}

function sortSocialMonths(months: SocialMonthRecord[]) {
  return [...months].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}

function readSocialMonths(clientId: string): SocialMonthRecord[] {
  try {
    const raw = window.localStorage.getItem(monthStorageKey(clientId));
    if (raw) {
      const parsed = JSON.parse(raw) as SocialMonthCollection | SocialMonthRecord[];
      const values = Array.isArray(parsed) ? parsed : parsed.months;
      if (Array.isArray(values)) {
        const realMonths = values.filter(item => item?.monthKey && !isLegacySeededSocialProject(item.project));
        if (realMonths.length !== values.length) writeSocialMonths(clientId, realMonths);
        return sortSocialMonths(realMonths.map(item => ({
          ...item,
          id: item.id || item.monthKey,
          project: normalizeProject(item.project),
        })));
      }
    }

    const legacyRaw = window.localStorage.getItem(legacySocialStorageKey(clientId));
    if (legacyRaw) {
      const legacyProject = JSON.parse(legacyRaw) as Partial<SocialProject>;
      window.localStorage.removeItem(legacySocialStorageKey(clientId));
      if (isLegacySeededSocialProject(legacyProject)) return [];
      const record = newMonthRecord(currentMonthKey(), normalizeProject(legacyProject));
      writeSocialMonths(clientId, [record]);
      return [record];
    }
  } catch { /* ignore unreadable saved data and start with an empty month list */ }
  return [];
}

function writeSocialMonths(clientId: string, months: SocialMonthRecord[]) {
  window.localStorage.setItem(monthStorageKey(clientId), JSON.stringify({ months: sortSocialMonths(months) } satisfies SocialMonthCollection));
}

function nextSocialMonthKey(months: SocialMonthRecord[]) {
  const latest = months.reduce((value, item) => item.monthKey > value ? item.monthKey : value, currentMonthKey());
  const used = new Set(months.map(item => item.monthKey));
  let candidate = used.has(latest) ? monthKeyAtOffset(latest, 1) : latest;
  while (used.has(candidate)) candidate = monthKeyAtOffset(candidate, 1);
  return candidate;
}

function socialMonthStatus(project: SocialProject) {
  const approved = project.posts.filter(post => post.status === "approved").length;
  const state = deriveAiReviewState({
    generated: project.posts.length > 0,
    approved: project.posts.length > 0 && approved === project.posts.length,
    shared: project.sent,
    drafting: project.posts.length === 0 && (project.analyzed || project.entered),
  });
  const meta = aiReviewMeta(state);
  const stage = project.sent ? `${project.posts.length} posts shared` : project.posts.length ? `${approved}/${project.posts.length} approved` : "Content brief";
  return { label: meta.label, tone: meta.tone, stage };
}

function channel(id: ChannelId) {
  return CHANNELS.find(item => item.id === id) || CHANNELS[0];
}

function ChannelLogo({ id, size = 15 }: { id: ChannelId; size?: number }) {
  const shared = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
    "data-channel-logo": id,
  } as const;

  if (id === "ig") return <svg {...shared} fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>;
  if (id === "tt") return <svg {...shared}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>;
  if (id === "li") return <svg {...shared}><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.04c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>;
  if (id === "fb") return <svg {...shared}><path d="M24 12.07C24 5.45 18.63.07 12 .07S0 5.45 0 12.07c0 5.99 4.39 10.96 10.13 11.86v-8.39H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95h-1.51c-1.49 0-1.96.92-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.39C19.61 23.03 24 18.06 24 12.07z"/></svg>;
  if (id === "x") return <svg {...shared}><path d="M18.24 2.25h3.31l-7.23 8.26 8.51 11.24h-6.66l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.84L7.08 4.13H5.12l11.96 15.64z"/></svg>;
  if (id === "pin") return <svg {...shared}><path d="M12.02 0C5.4 0 .03 5.37.03 11.99c0 5.08 3.16 9.42 7.62 11.17-.11-.95-.2-2.4.04-3.44l1.41-5.96s-.36-.72-.36-1.78c0-1.67.97-2.92 2.17-2.92 1.02 0 1.52.77 1.52 1.69 0 1.03-.66 2.57-.99 3.99-.29 1.2.6 2.17 1.77 2.17 2.14 0 3.78-2.25 3.78-5.49 0-2.88-2.07-4.89-5.02-4.89-3.41 0-5.42 2.57-5.42 5.21 0 1.03.4 2.14.9 2.74.09.12.11.22.08.34l-.34 1.36c-.05.23-.17.27-.4.17-1.5-.7-2.43-2.89-2.43-4.64 0-3.78 2.75-7.25 7.92-7.25 4.15 0 7.38 2.96 7.38 6.93 0 4.13-2.6 7.45-6.21 7.45-1.22 0-2.36-.63-2.75-1.38l-.75 2.85c-.27 1.04-1 2.35-1.49 3.14 1.12.35 2.32.54 3.56.54 6.62 0 11.99-5.37 11.99-11.99C24.01 5.37 18.64 0 12.02 0z"/></svg>;
  return <svg {...shared}><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>;
}

function ChannelMark({ id, size = 1.65, logoSize = 14 }: { id: ChannelId; size?: number; logoSize?: number }) {
  const item = channel(id);
  return <span title={item.label} style={css(`width:${size}rem;height:${size}rem;flex:0 0 ${size}rem;border-radius:50%;display:grid;place-items:center;background:${item.color};color:#fff`)}><ChannelLogo id={id} size={logoSize}/></span>;
}

function postChannelIds(post: SocialPost) {
  return [post.channel, ...(post.crossPostTo || []).filter(id => id !== post.channel)].filter((id, index, list) => list.indexOf(id) === index);
}

function ChannelMarks({ ids, size = 1.2, logoSize = 10, max = 3 }: { ids: ChannelId[]; size?: number; logoSize?: number; max?: number }) {
  const visible = ids.slice(0, max);
  return <span aria-label={ids.map(id => channel(id).label).join(", ")} title={ids.map(id => channel(id).label).join(", ")} style={css("display:inline-flex;align-items:center;padding-left:" + (visible.length > 1 ? ".22rem" : "0"))}>
    {visible.map((id, index) => <span key={id} style={css("display:inline-flex;margin-left:" + (index ? "-.22rem" : "0") + ";position:relative;z-index:" + (visible.length - index))}><ChannelMark id={id} size={size} logoSize={logoSize}/></span>)}
    {ids.length > max && <span style={css(`width:${size}rem;height:${size}rem;margin-left:-.22rem;border-radius:50%;display:grid;place-items:center;background:var(--surface);border:1px solid var(--border);font-size:var(--text-2xs);color:var(--fg-muted)`)}>+{ids.length - max}</span>}
  </span>;
}

function PostChannelMarks({ post, size = 1.2, logoSize = 10, max = 3 }: { post: SocialPost; size?: number; logoSize?: number; max?: number }) {
  return <ChannelMarks ids={postChannelIds(post)} size={size} logoSize={logoSize} max={max}/>;
}

function postDestinationLabel(post: SocialPost) {
  const count = postChannelIds(post).length;
  return count > 1 ? `Cross-post · ${count} channels` : "Single channel";
}

function formatFor(channelId: ChannelId, index: number) {
  if (channelId === "tt" || channelId === "yt") return "Vertical video";
  if (channelId === "li" || channelId === "pin") return "Carousel";
  if (channelId === "x") return "Text post";
  return index % 3 === 0 ? "Vertical video" : index % 2 === 0 ? "Carousel" : "Static image";
}

function generatePosts(project: SocialProject, ideas: SocialIdea[]): SocialPost[] {
  const total = Math.min(48, project.channels.reduce((sum, id) => sum + project.cadence[id] * project.weeks, 0));
  const remaining = Object.fromEntries(project.channels.map(id => [id, project.cadence[id] * project.weeks])) as Partial<Record<ChannelId, number>>;
  const queue: ChannelId[] = [];
  while (queue.length < total) {
    let added = false;
    project.channels.forEach(id => {
      if (queue.length < total && (remaining[id] || 0) > 0) {
        queue.push(id);
        remaining[id] = (remaining[id] || 0) - 1;
        added = true;
      }
    });
    if (!added) break;
  }
  return Array.from({ length: total }, (_, index) => {
    const channelId = queue[index] || project.channels[index % project.channels.length] || "ig";
    const idea = ideas[index];
    const day = 1 + Math.min(27, Math.floor(index * 28 / Math.max(total, 1)));
    return {
      id: `social-${channelId}-${index + 1}`,
      day,
      channel: channelId,
      crossPostTo: [],
      pillar: idea.pillar,
      title: idea.title,
      caption: idea.caption,
      hashtags: idea.hashtags.join(" "),
      graphicCopy: idea.graphicCopy,
      link: "",
      artDirection: idea.artDirection,
      format: formatFor(channelId, index),
      time: index % 2 ? "6:30 PM" : "10:00 AM",
      status: "draft",
    };
  });
}

function Panel({ children, style = "", hidden = false }: { children: ReactNode; style?: string; hidden?: boolean }) {
  return <section hidden={hidden} style={css("border:1px solid var(--border-soft);border-radius:1rem;background:var(--surface);" + style)}>{children}</section>;
}

function SocialCalendarHero() {
  return <div style={css("border:1px solid var(--border-soft);border-radius:.82rem;background:var(--surface-alt);padding:.62rem") }>
    <div style={css("display:grid;grid-template-columns:repeat(7,1fr);gap:.22rem")}>{Array.from({ length: 21 }, (_, index) => <span key={index} style={css("position:relative;aspect-ratio:1;border-radius:.28rem;background:var(--surface);border:1px solid var(--border-soft)")}>{[2, 5, 8, 11, 13, 17, 19].includes(index) && <i style={css("position:absolute;left:20%;right:20%;bottom:24%;height:.2rem;border-radius:999px;background:" + CHANNELS[index % CHANNELS.length].color)}/>}</span>)}</div>
    <div style={css("display:flex;align-items:center;justify-content:space-between;margin-top:.5rem;font-size:var(--text-2xs);color:var(--fg-faint)")}><span>Voice → plan → calendar</span><span style={css("color:var(--accent)")}>Ready to build</span></div>
  </div>;
}

function SocialIntroScreen({ mobile, onStart }: { mobile: boolean; onStart: () => void }) {
  return <Panel style="overflow:hidden">
    <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "minmax(0,1fr) minmax(0,.86fr)") + ";align-items:stretch") }>
      <div style={css("padding:" + (mobile ? "1.35rem 1.2rem 1.45rem" : "1.9rem 1.8rem 2rem") + ";display:flex;flex-direction:column") }>
        <div style={css("display:flex;align-items:center;gap:var(--space-2);font-size:var(--text-label);font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:var(--accent)")}><span style={css("width:.38rem;height:.38rem;border-radius:50%;background:var(--accent)")}/>Baltz Studio · Content engine</div>
        <h2 style={css("margin:.75rem 0 0;font-size:var(--text-3xl);font-weight:500;line-height:1.12;letter-spacing:-.02em")}>A month of content,<br/>mapped and ready.</h2>
        <p style={css("margin:.6rem 0 0;font-size:var(--text-base);color:var(--fg-muted);line-height:1.5;max-width:24rem")}>Paste what you already post. We draft the month, you approve it layer by layer, and it lands on a calendar ready to schedule.</p>
        <div style={css("margin-top:1.2rem;border:1px solid var(--border-soft);border-radius:var(--radius);overflow:hidden")}>{INTRO_STEPS.map((step, index) => <div key={step.title} style={css("display:flex;align-items:center;gap:.7rem;padding:.62rem .85rem;background:var(--surface)" + (index < INTRO_STEPS.length - 1 ? ";border-bottom:1px solid var(--border-soft)" : ""))}><span style={css("width:1.85rem;height:1.85rem;border-radius:8px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;flex-shrink:0")}><Icon name={step.icon} size={15}/></span><span style={css("flex:1;min-width:0;font-size:var(--text-base);font-weight:500")}>{step.title}</span><span style={css("font-size:var(--text-2xs);color:var(--fg-faint);white-space:nowrap")}>{step.tag}</span><span style={css("font-size:var(--text-2xs);color:var(--fg-faint);width:.9rem;text-align:right")}>{step.num}</span></div>)}</div>
        <button type="button" onClick={onStart} style={css(buttonPrimary + ";width:100%;margin-top:1.2rem;min-height:2.55rem")}>Start a calendar <Icon name="arrow" size={14}/></button>
      </div>
      <div style={css("background:var(--surface-alt);border-left:" + (mobile ? "none" : "1px solid var(--border-soft)") + ";border-top:" + (mobile ? "1px solid var(--border-soft)" : "none") + ";min-height:" + (mobile ? "22rem" : "30rem") + ";padding:1.6rem 1.5rem") }>
        <div style={css("background:#fff;border:1px solid var(--border-soft);border-radius:12px;box-shadow:0 20px 50px -30px rgba(60,40,30,.5);overflow:hidden") }><div style={css("padding:.75rem .9rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;justify-content:space-between") }><span style={css("font-size:var(--text-sm);font-weight:500")}>May · 16 posts</span><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>3 channels</span></div><div style={css("display:grid;grid-template-columns:repeat(7,1fr);padding:.5rem .6rem .7rem;gap:.28rem")}>{Array.from({ length: 21 }, (_, index) => <div key={index} style={css("aspect-ratio:1;border-radius:5px;background:" + (index % 5 === 0 ? "var(--accent-soft)" : "var(--surface-alt)") + ";padding:.2rem;position:relative") }><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{index + 1}</span>{[1, 4, 7, 10, 13, 16, 19].includes(index) && <span style={css("position:absolute;bottom:.2rem;left:.2rem;right:.2rem;height:.32rem;border-radius:2px;background:" + CHANNELS[index % 3].color)}/>}</div>)}</div></div>
        <div style={css("margin-top:.9rem;background:#fff;border:1px solid var(--border-soft);border-radius:12px;box-shadow:0 16px 40px -28px rgba(60,40,30,.5);padding:.85rem .95rem") }><div style={css("display:flex;align-items:center;gap:var(--space-2);margin-bottom:.5rem") }><span style={css("width:1.4rem;height:1.4rem;border-radius:6px;background:#d86478;color:#fff;display:grid;place-items:center;font-size:var(--text-2xs);font-weight:500")}>Ig</span><span style={css("font-size:var(--text-2xs);font-weight:500;padding:.1rem .45rem;border-radius:999px;background:var(--accent-soft);color:var(--accent)")}>Reel · 9:16</span><span style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-left:auto")}>Wed 12:00pm</span></div><div style={css("font-size:var(--text-xs);font-weight:500")}>A day behind the brand</div><p style={css("margin:.25rem 0 0;font-size:var(--text-2xs);color:var(--fg-muted);line-height:1.5")}>Come behind the scenes for a look at the people, process, and thinking behind the finished work.</p><div style={css("font-size:var(--text-2xs);color:var(--accent);margin-top:.4rem")}>#behindthescenes #brandstory #founder</div></div>
      </div>
    </div>
  </Panel>;
}

function StageShell({ stage, clientName, status, children }: { stage: Stage; clientName: string; status: string; children: ReactNode }) {
  const item = STAGES.find(candidate => candidate.id === stage) || STAGES[0];
  const complete = status === "Approved" || status === "Scheduled";
  return <Panel style="overflow:hidden"><div style={css("padding:.9rem 1.15rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;gap:.6rem") }><span style={css("width:1.9rem;height:1.9rem;border-radius:8px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center") }><Icon name={item.icon} size={16}/></span><div style={css("flex:1;min-width:0") }><div style={css("font-size:var(--text-lg);font-weight:500")}>{item.label}</div><div style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>{item.note} · {clientName}</div></div><span className="pt-badge" style={css("font-size:var(--text-2xs);font-weight:500;padding:.2rem .6rem;border-radius:999px;background:" + (complete ? "var(--success-soft)" : "var(--accent-soft)") + ";color:" + (complete ? "var(--success)" : "var(--accent)"))}>{status}</span></div><div style={css("padding:1.1rem")}>{children}</div></Panel>;
}

export function SocialMediaBuilder({ state, actions }: { state: PortalState; actions: PortalActions }) {
  const [activeMonth, setActiveMonth] = useState<{ client: StudioClient; monthId: string } | null>(null);
  const [savedMonths, setSavedMonths] = useState<Record<string, SocialMonthRecord[]>>({});
  const availableClients = useMemo(() => clientsVisibleToRole(state.role, state.clientName), [state.clientName, state.role]);
  const persistMonths = (clientId: string, months: SocialMonthRecord[]) => {
    const sorted = sortSocialMonths(months);
    writeSocialMonths(clientId, sorted);
    const latest = sorted[0];
    const stageIndex = latest ? STAGES.findIndex(stage => stage.id === latest.project.stage) : -1;
    actions.update(current => {
      const existing = current.clientWorkspaces[clientId]?.engineWork.socialBuilder;
      const clientName = availableClients.find(client => client.id === clientId)?.name || clientId;
      return {
        clientWorkspaces: saveEngineWork(current.clientWorkspaces, clientId, "socialBuilder", latest ? {
          status: latest.project.sent ? "complete" : latest.project.posts.length ? "in_progress" : "intake",
          progress: latest.project.sent ? 100 : Math.max(12, Math.round(((stageIndex + 1) / STAGES.length) * 90)),
          updatedAt: latest.updatedAt,
          processRun: syncPortalProcessRun(existing?.processRun, {
            processId: "social-media-operations",
            runId: latest.id,
            clientId,
            clientName,
            currentStageId: latest.project.stage,
            approvedStageIds: STAGES.slice(0, Math.max(0, stageIndex)).map(stage => stage.id),
            awaitingApproval: latest.project.stage === "calendar" && !latest.project.sent,
            complete: latest.project.sent,
            updatedAt: latest.updatedAt,
          }),
          payload: { months: sorted },
        } : null),
      };
    });
  };
  useEffect(() => { if (activeMonth && !isUnassignedEngineClient(activeMonth.client) && !availableClients.some(item => item.id === activeMonth.client.id)) setActiveMonth(null); }, [activeMonth, availableClients]);
  useEffect(() => {
    if (activeMonth) return;
    setSavedMonths(Object.fromEntries(availableClients.map(item => {
      const payload = state.clientWorkspaces[item.id]?.engineWork.socialBuilder?.payload as { months?: SocialMonthRecord[] } | undefined;
      const persistedMonths = (payload?.months || []).filter(month => !isLegacySeededSocialProject(month.project));
      return [item.id, persistedMonths.length ? sortSocialMonths(persistedMonths) : readSocialMonths(item.id)];
    })));
  }, [activeMonth, availableClients, state.clientWorkspaces]);
  useEffect(() => {
    if (state.role !== "client" || activeMonth) return;
    const client = availableClients[0];
    const latest = client ? sortSocialMonths(readSocialMonths(client.id))[0] : undefined;
    if (client && latest) setActiveMonth({ client, monthId: latest.id });
  }, [activeMonth, availableClients, state.role]);

  const createMonth = (client: StudioClient) => {
    // Always start from storage so a month created from inside the workspace
    // cannot overwrite edits that have not yet flowed back into the picker.
    const current = readSocialMonths(client.id);
    const monthKey = nextSocialMonthKey(current);
    const workspace = isUnassignedEngineClient(client) ? null : actions.workspaceForClient(client.name);
    const voice = workspace?.brandSystem?.tone.traits || [];
    const sourceText = [
      ...(workspace?.notes || []).map(note => note.text.trim()).filter(Boolean),
      voice.length ? `Voice: ${voice.join(", ")}` : "",
      workspace?.brandSystem?.tone.avoid ? `Avoid: ${workspace.brandSystem.tone.avoid}` : "",
    ].filter(Boolean).join("\n\n");
    const record = newMonthRecord(monthKey, {
      ...blankProject(),
      source: sourceText ? "brand" : "handle",
      sourceText,
      voice,
    });
    const next = sortSocialMonths([...current, record]);
    persistMonths(client.id, next);
    setSavedMonths(months => ({ ...months, [client.id]: next }));
    setActiveMonth({ client, monthId: record.id });
    actions.showToast(`${formatMonthKey(monthKey)} calendar ready for ${client.name}`);
  };

  const startCalendar = () => {
    const target = startClientForEngine(state.role, availableClients);
    if (!target) return;
    const current = readSocialMonths(target.id);
    const latest = sortSocialMonths(current)[0];
    if (latest) {
      setSavedMonths(months => ({ ...months, [target.id]: current }));
      setActiveMonth({ client: target, monthId: latest.id });
      return;
    }
    createMonth(target);
  };

  const deleteMonth = (client: StudioClient, monthId: string) => {
    const current = readSocialMonths(client.id);
    const removed = current.find(item => item.id === monthId);
    const next = current.filter(item => item.id !== monthId);
    persistMonths(client.id, next);
    setSavedMonths(months => ({ ...months, [client.id]: next }));
    if (removed) actions.showToast(`${formatMonthKey(removed.monthKey)} calendar deleted`);
  };

  const cards = useMemo(() => availableClients.filter(item => (savedMonths[item.id] || []).length > 0).map(item => {
    const months = sortSocialMonths(savedMonths[item.id] || []);
    const latest = months[0];
    const latestStatus = latest ? socialMonthStatus(latest.project) : socialMonthStatus(blankProject());
    return {
      id: item.id,
      name: item.name,
      subtitle: months.length ? `${months.length} month${months.length === 1 ? "" : "s"} created` : "No monthly plans yet",
      statusLabel: latestStatus.label,
      statusTone: latestStatus.tone,
      stage: latestStatus.stage,
      progress: 0,
      owner: item.owner,
      due: latest ? formatMonthKey(latest.monthKey) : "—",
      showProgress: false,
      showStage: false,
      showMeta: false,
      showFooter: false,
      hero: <SocialCalendarHero/>,
      compactDetails: true,
      details: months.map(month => {
        const status = socialMonthStatus(month.project);
        return {
          id: month.id,
          title: formatMonthKey(month.monthKey),
          statusLabel: status.label,
          statusTone: status.tone,
          stage: status.stage,
          assignee: item.owner,
          due: "",
          trailing: <ChannelMarks ids={month.project.channels} size={1.18} logoSize={10} max={4}/>,
          actions: [
            { label: "Open", onClick: () => setActiveMonth({ client: item, monthId: month.id }) },
            { label: "Delete", onClick: () => deleteMonth(item, month.id) },
          ],
        };
      }),
      primaryLabel: latest ? "Open latest" : "Start calendar",
      onPrimary: () => latest ? setActiveMonth({ client: item, monthId: latest.id }) : createMonth(item),
      secondaryLabel: "New month",
      secondaryIcon: "plus",
      onSecondary: () => createMonth(item),
      headerAction: { label: `Create the next monthly calendar for ${item.name}`, icon: "plus", onClick: () => createMonth(item) },
    };
  }), [availableClients, savedMonths]);

  if (activeMonth) return <SocialWorkspace
    key={`${activeMonth.client.id}:${activeMonth.monthId}`}
    client={activeMonth.client}
    monthId={activeMonth.monthId}
    months={savedMonths[activeMonth.client.id] || []}
    mobile={state.isMobile}
    hideIdentity={state.role === "client"}
    actions={actions}
    onSelectMonth={monthId => setActiveMonth(current => current ? { ...current, monthId } : current)}
    onCreateMonth={() => createMonth(activeMonth.client)}
    onExit={() => state.role === "client" ? actions.setView("progress") : setActiveMonth(null)}
  />;

  return <div style={css("width:100%;padding:" + (state.isMobile ? "1rem .9rem 1.5rem" : "1.6rem 2rem 2.4rem"))}>
    <GuidedIntakeSelector
      eyebrow="Social Media Builder"
      eyebrowColor="var(--accent)"
      title="Start or continue a content calendar"
      description="Add the brand context, channels, and cadence. Get editable posts, approvals, and a schedule-ready monthly plan."
      controlsBelow
      controls={<EngineIndexControls
        metrics={[]}
        action={{ label: "New calendar", onClick: startCalendar, disabled: state.role === "client" && !availableClients.length }}
      />}
      overview={<EngineIndexOverview
        metrics={[{ label: `${cards.length} active`, tone: "accent", icon: "cal" }]}
      />}
      countLabel="calendar"
      cards={cards}
    />
  </div>;
}

function SocialWorkspace({ client, monthId, months, mobile, hideIdentity, actions, onSelectMonth, onCreateMonth, onExit }: { client: StudioClient; monthId: string; months: SocialMonthRecord[]; mobile: boolean; hideIdentity: boolean; actions: PortalActions; onSelectMonth: (monthId: string) => void; onCreateMonth: () => void; onExit: () => void }) {
  const [project, setProject] = useState<SocialProject>(blankProject);
  const [loaded, setLoaded] = useState(false);
  const [aiBusy, setAiBusy] = useState<"analyze" | "plan" | null>(null);
  const [aiTick, setAiTick] = useState(0);
  const [aiError, setAiError] = useState("");
  const monthRecord = months.find(item => item.id === monthId);
  const monthKey = monthRecord?.monthKey || monthId;

  useEffect(() => {
    const selected = months.find(item => item.id === monthId) || readSocialMonths(client.id).find(item => item.id === monthId);
    setProject(normalizeProject(selected?.project));
    setLoaded(true);
  }, [client.id, monthId, months]);
  useEffect(() => {
    if (!loaded) return;
    const current = readSocialMonths(client.id);
    const now = new Date().toISOString();
    const next = current.map(item => item.id === monthId ? { ...item, project: { ...project, savedAt: now }, updatedAt: now } : item);
    const months = sortSocialMonths(next.some(item => item.id === monthId) ? next : [...next, newMonthRecord(monthKey, project)]);
    writeSocialMonths(client.id, months);
    const activeStageIndex = Math.max(0, STAGES.findIndex(stage => stage.id === project.stage));
    actions.update(currentState => ({
      clientWorkspaces: saveEngineWork(currentState.clientWorkspaces, client.id, "socialBuilder", {
        status: project.sent ? "complete" : project.posts.length ? "in_progress" : "intake",
        progress: project.sent ? 100 : Math.max(12, Math.round(((activeStageIndex + 1) / STAGES.length) * 90)),
        updatedAt: now,
        payload: { months },
      }),
    }));
  }, [actions, client.id, loaded, monthId, monthKey, project]);
  useEffect(() => {
    if (!aiBusy) return;
    setAiTick(0);
    const interval = window.setInterval(() => setAiTick(tick => tick + 1), 1200);
    return () => window.clearInterval(interval);
  }, [aiBusy]);

  const stageIndex = STAGES.findIndex(item => item.id === project.stage);
  const approved = project.posts.filter(post => post.status === "approved").length;
  const selectedPost = project.posts.find(post => post.id === project.selectedPostId) || project.posts[0] || null;
  const patch = (next: Partial<SocialProject>) => setProject(current => ({ ...current, ...next }));
  const updatePost = (id: string, next: Partial<SocialPost>) => setProject(current => ({ ...current, posts: current.posts.map(post => post.id === id ? { ...post, ...next } : post) }));

  const requestSocialAi = async (action: "analyze" | "plan") => {
    const count = Math.min(48, project.channels.reduce((sum, id) => sum + project.cadence[id] * project.weeks, 0));
    const response = await fetch("/api/ai/social-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, clientName: client.name, source: project.source, sourceText: project.sourceText, voice: project.voice, pillars: project.pillars, channels: project.channels.map(id => channel(id).label), weeks: project.weeks, count }),
    });
    const payload = await response.json().catch(() => null) as { result?: { voice?: string[]; pillars?: string[]; ideas?: SocialIdea[] }; error?: string } | null;
    if (!response.ok || !payload?.result) throw new Error(payload?.error || "The social plan could not be completed.");
    return payload.result;
  };
  const analyze = async () => {
    setAiError("");
    setAiBusy("analyze");
    try {
      const result = await requestSocialAi("analyze");
      patch({ analyzed: true, voice: result.voice || [], pillars: result.pillars || [] });
      actions.showToast("Brand voice and content pillars mapped");
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Unable to analyze this content.");
    } finally { setAiBusy(null); }
  };
  const buildPlan = async () => {
    setAiError("");
    setAiBusy("plan");
    try {
      const result = await requestSocialAi("plan");
      const posts = generatePosts(project, result.ideas || []);
      patch({ posts, selectedPostId: posts[0]?.id || null, stage: "plan" });
      actions.showToast(`${posts.length} social posts planned`);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "Unable to build this content plan.");
    } finally { setAiBusy(null); }
  };
  const exportCsv = () => {
    const rows = [["Date", "Time", "Primary Channel", "Cross-post Channels", "Posting Type", "Pillar", "Format", "Title", "Caption", "Hashtags", "Status"], ...project.posts.map(post => [`Day ${post.day}`, post.time, channel(post.channel).label, (post.crossPostTo || []).map(id => channel(id).label).join(", "), postDestinationLabel(post), post.pillar, post.format, post.title, post.caption, post.hashtags, post.status])];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `${client.id}-${monthKey}-social-calendar.csv`;
    link.click();
    URL.revokeObjectURL(href);
    actions.showToast("Social calendar exported");
  };
  const restart = () => {
    setProject(blankProject());
    actions.showToast("Started a fresh social calendar");
  };

  const doneCount = Math.min(STAGES.length, stageIndex + (project.sent ? 1 : 0));
  const stageStatus = aiReviewMeta(deriveAiReviewState({
    generated: project.analyzed || project.posts.length > 0,
    approved: project.posts.length > 0 && approved === project.posts.length,
    shared: project.sent,
    drafting: project.posts.length === 0 && (project.stage === "brief" || project.stage === "plan"),
  })).label;

  return <div style={css("width:100%;padding:" + (mobile ? ".9rem .75rem 1.4rem" : "1.4rem 2rem 2rem") + ";box-sizing:border-box") }>
    <div style={css("width:100%;max-width:60rem;margin:0 auto;display:flex;flex-direction:column;gap:.85rem;box-sizing:border-box") }>
      <header style={css("display:flex;align-items:center;gap:.65rem;flex-wrap:wrap") }>
        {!hideIdentity && <button type="button" onClick={onExit} className="pt-softbtn" style={css(buttonSoft + ";min-height:2rem")}>← All builders</button>}
        {!hideIdentity && <div style={{ minWidth: 0 }}><strong style={css("font-size:var(--text-lg);font-weight:500")}>{client.name}</strong><span style={css("font-size:var(--text-sm);color:var(--fg-muted)")}> · {formatMonthKey(monthKey)}</span></div>}
        <select aria-label="Switch monthly content plan" value={monthId} onChange={event => onSelectMonth(event.target.value)} style={css("min-height:2rem;padding:0 1.8rem 0 .68rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font:inherit;font-size:var(--text-2xs);cursor:pointer")}>{sortSocialMonths(months).map(month => <option key={month.id} value={month.id}>{formatMonthKey(month.monthKey)}</option>)}</select>
        <button type="button" onClick={onCreateMonth} className="pt-softbtn" style={css(buttonSoft + ";min-height:2rem")}><Icon name="plus" size={12}/> New month</button>
        <button type="button" onClick={restart} className="pt-softbtn" style={css(buttonSoft + ";min-height:2rem;margin-left:auto")}>↻ Start over</button>
      </header>

      <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "14rem minmax(0,1fr)") + ";gap:.85rem;align-items:start") }>
        <aside style={css("border:1px solid var(--border-soft);border-radius:var(--radius-panel);background:linear-gradient(180deg,var(--surface),color-mix(in srgb,var(--surface-alt) 78%,white 22%));padding:.9rem .7rem .7rem;" + (mobile ? "overflow-x:auto" : "position:sticky;top:.5rem"))}>
          <div style={css("padding:0 .4rem .8rem;min-width:" + (mobile ? "38rem" : "0")) }>
            <div style={css("display:flex;align-items:center;gap:.55rem") }><span style={css("width:1.7rem;height:1.7rem;border-radius:8px;background:var(--accent);color:#fff;display:grid;place-items:center;flex-shrink:0") }><Icon name="layers" size={14}/></span><div><div style={css("font-size:var(--text-lg);font-weight:500;line-height:1.1")}>Content pipeline</div><div style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-top:.1rem")}>{STAGES.length} stages to schedule</div></div></div>
            <div style={css("display:flex;align-items:center;gap:.55rem;margin-top:.75rem") }><div style={css("flex:1;height:.35rem;border-radius:999px;background:var(--border-soft);overflow:hidden") }><div style={css("height:100%;border-radius:999px;background:var(--success);width:" + Math.max(2, doneCount / STAGES.length * 100) + "%;transition:width .35s ease")}/></div><span style={css("font-size:var(--text-2xs);font-weight:500;color:var(--fg-muted)")}>{doneCount}/{STAGES.length}</span></div>
          </div>
          <div style={css("display:flex;flex-direction:" + (mobile ? "row" : "column") + ";" + (mobile ? "gap:.4rem;" : "") + "min-width:" + (mobile ? "38rem" : "0"))}>
            {STAGES.map((item, index) => {
              const active = item.id === project.stage;
              const done = index < stageIndex || (index === STAGES.length - 1 && project.sent);
              const enabled = index <= stageIndex;
              const dotBg = done ? "var(--success)" : active ? "var(--accent)" : "var(--surface)";
              const dotBorder = done ? "var(--success)" : active ? "var(--accent)" : "var(--border)";
              const dotColor = done || active ? "#fff" : "var(--fg-faint)";
              return <button key={item.id} type="button" aria-current={active ? "step" : undefined} disabled={!enabled} onClick={() => enabled && patch({ stage: item.id })} style={css("display:flex;align-items:center;gap:.6rem;" + (mobile ? "flex-direction:column;min-width:9.2rem;text-align:center;padding:.35rem .3rem;" : "padding:.15rem .4rem;") + "border:none;border-radius:8px;background:" + (active ? "var(--accent-soft)" : "transparent") + ";text-align:left;cursor:" + (enabled ? "pointer" : "default") + ";opacity:" + (enabled ? "1" : ".55"))}>
                <span style={css("position:relative;display:flex;flex-direction:column;align-items:center;flex-shrink:0")}>
                  {!mobile && <span aria-hidden="true" style={css("width:2px;height:.5rem;background:" + (index === 0 ? "transparent" : "var(--border)"))}/>}
                  <span style={css("width:1.15rem;height:1.15rem;border-radius:50%;display:grid;place-items:center;flex-shrink:0;font-size:var(--text-2xs);font-weight:500;background:" + dotBg + ";border:1px solid " + dotBorder + ";color:" + dotColor)}>{done ? <Icon name="checkmark" size={9}/> : index + 1}</span>
                  {!mobile && <span aria-hidden="true" style={css("width:2px;height:.5rem;background:" + (index === STAGES.length - 1 ? "transparent" : "var(--border)"))}/>}
                </span>
                <span style={css("font-size:var(--text-sm);font-weight:" + (active ? "500" : "400") + ";color:" + (active ? "var(--fg)" : enabled ? "var(--fg-muted)" : "var(--fg-faint)"))}>{item.label}</span>
              </button>;
            })}
          </div>
        </aside>

        <main style={{ minWidth: 0 }}>
          {project.stage === "brief" && !project.entered && <SocialIntroScreen mobile={mobile} onStart={() => patch({ entered: true })}/>} 
          {project.stage === "brief" && project.entered && <BriefStage clientName={client.name} project={project} patch={patch} analyze={analyze} buildPlan={buildPlan} mobile={mobile} aiBusy={aiBusy} aiTick={aiTick} aiError={aiError}/>}
          {project.stage === "plan" && <StageShell stage="plan" clientName={client.name} status={stageStatus}><PlanStage project={project} patch={patch} mobile={mobile} rebuild={buildPlan} aiBusy={aiBusy} aiTick={aiTick}/></StageShell>}
          {project.stage === "calendar" && <StageShell stage="calendar" clientName={client.name} status={stageStatus}><CalendarStage monthKey={monthKey} project={project} patch={patch} selectedPost={selectedPost} updatePost={updatePost} mobile={mobile} actions={actions}/></StageShell>} 
          {project.stage === "schedule" && <StageShell stage="schedule" clientName={client.name} status={stageStatus}><ScheduleStage project={project} approved={approved} exportCsv={exportCsv} actions={actions} patch={patch}/></StageShell>} 
        </main>
      </div>
    </div>
  </div>;
}

function SourceAnalyzer({ clientName, project, patch, analyze, mobile, busy, error }: { clientName: string; project: SocialProject; patch: (next: Partial<SocialProject>) => void; analyze: () => void; mobile: boolean; busy: boolean; error: string }) {
  const source = SOURCE_TABS.find(item => item.id === project.source) || SOURCE_TABS[0];
  const clientSlug = clientName.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "").replace(/^the/, "");
  const suggestedSite = `https://${clientSlug || "yourbrand"}.com`;
  const setSource = (nextSource: SourceId) => {
    const nextText = nextSource === "website" && (!project.sourceText.trim() || project.source === "website")
      ? suggestedSite
      : project.sourceText;
    patch({ source: nextSource, sourceText: nextText, analyzed: false });
  };

  return <Panel style="padding:1rem 1.05rem">
    <div style={css("display:flex;align-items:center;gap:.6rem") }>
      <span style={css("width:1.9rem;height:1.9rem;border-radius:8px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center") }><Icon name="sparkle" size={15}/></span>
      <div><h2 style={css("margin:0;font-size:var(--text-lg);font-weight:500")}>Jump-start from what you already post</h2><p style={css("margin:.15rem 0 0;font-size:var(--text-2xs);color:var(--fg-muted)")}>We read your voice and pillars so you skip the questionnaire.</p></div>
    </div>

    <div style={css("margin-top:.85rem;border:1px solid var(--border);border-radius:.95rem;background:var(--surface);overflow:hidden") }>
      <div role="tablist" aria-label="Content source" style={css("display:flex;align-items:center;gap:.28rem;flex-wrap:wrap;padding:.55rem .58rem;border-bottom:1px solid var(--border-soft);background:var(--surface-alt)") }>
        {SOURCE_TABS.map(item => <button key={item.id} type="button" role="tab" aria-selected={project.source === item.id} onClick={() => setSource(item.id)} style={css("min-height:1.95rem;padding:0 .68rem;border:1px solid " + (project.source === item.id ? "var(--accent)" : "transparent") + ";border-radius:999px;background:" + (project.source === item.id ? "var(--accent-soft)" : "transparent") + ";color:" + (project.source === item.id ? "var(--accent)" : "var(--fg-muted)") + ";font-size:var(--text-2xs);cursor:pointer")}>{item.label}</button>)}
      </div>

      <div style={css("padding:.7rem .72rem .62rem") }>
        {project.source === "website" && <div style={css("display:flex;align-items:center;gap:.42rem;flex-wrap:wrap;margin-bottom:.55rem") }>
          <span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>Choose a site:</span>
          <button type="button" onClick={() => patch({ sourceText: suggestedSite, analyzed: false })} aria-pressed={project.sourceText === suggestedSite} style={css("min-height:1.85rem;padding:0 .62rem;border:1px solid " + (project.sourceText === suggestedSite ? "var(--accent)" : "var(--border)") + ";border-radius:999px;background:" + (project.sourceText === suggestedSite ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (project.sourceText === suggestedSite ? "var(--accent)" : "var(--fg-muted)") + ";font-size:var(--text-2xs);cursor:pointer")}>{clientName} website</button>
          <button type="button" onClick={() => patch({ sourceText: "", analyzed: false })} aria-pressed={project.sourceText !== suggestedSite} style={css("min-height:1.85rem;padding:0 .62rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--fg-muted);font-size:var(--text-2xs);cursor:pointer")}>Enter another site</button>
        </div>}
        <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "minmax(0,1fr) auto") + ";gap:.55rem;align-items:end") }>
          {project.source === "posts" || project.source === "brand" ? <textarea aria-label="Source content for social analysis" value={project.sourceText} onChange={event => patch({ sourceText: event.target.value, analyzed: false })} placeholder={source.placeholder} rows={4} style={css("width:100%;box-sizing:border-box;border:none;background:transparent;color:var(--fg);padding:.35rem .22rem;font:inherit;font-size:var(--text-xs);outline:none;resize:vertical;line-height:1.5")}/>
            : <input aria-label="Source content for social analysis" value={project.sourceText} onChange={event => patch({ sourceText: event.target.value, analyzed: false })} placeholder={source.placeholder} style={css("width:100%;box-sizing:border-box;border:none;background:transparent;color:var(--fg);padding:.62rem .22rem;font:inherit;font-size:var(--text-xs);outline:none")}/>}
          <button type="button" disabled={busy || !project.sourceText.trim()} onClick={analyze} style={css(buttonPrimary + ";align-self:end;opacity:" + (busy || !project.sourceText.trim() ? ".5" : "1")) }><Icon name="sparkle" size={14}/>{busy ? "Analyzing…" : "Analyze content"}</button>
        </div>
        {error && <p role="alert" style={css("margin:.55rem .22rem 0;font-size:var(--text-2xs);color:var(--danger)")}>{error}</p>}
      </div>
    </div>

    {project.analyzed && <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "1fr 1.25fr") + ";gap:.65rem;margin-top:.75rem") }><div style={css("padding:var(--space-3);border:1px solid var(--border-soft);border-radius:.8rem;background:var(--surface-alt)")}><span style={css("font-size:var(--text-label);text-transform:uppercase;color:var(--fg-faint)")}>Detected voice</span><div style={css("display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem")}>{project.voice.map(item => <span key={item} style={css("padding:.24rem .52rem;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:var(--text-2xs)")}>{item}</span>)}</div></div><div style={css("padding:var(--space-3);border:1px solid var(--border-soft);border-radius:.8rem;background:var(--surface-alt)")}><span style={css("font-size:var(--text-label);text-transform:uppercase;color:var(--fg-faint)")}>Content pillars</span><div style={css("display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem")}>{project.pillars.map(item => <span key={item} style={css("padding:.24rem .52rem;border-radius:999px;background:var(--surface);border:1px solid var(--border-soft);font-size:var(--text-2xs)")}>{item}</span>)}</div></div></div>}
  </Panel>;
}

function ChannelCadence({ project, patch, buildPlan, mobile, busy }: { project: SocialProject; patch: (next: Partial<SocialProject>) => void; buildPlan: () => void; mobile: boolean; busy: boolean }) {
  const total = project.channels.reduce((sum, id) => sum + project.cadence[id] * project.weeks, 0);
  const durations: Array<{ weeks: 1 | 2 | 4; label: string }> = [{ weeks: 1, label: "1 week" }, { weeks: 2, label: "2 weeks" }, { weeks: 4, label: "1 month" }];

  return <Panel style="overflow:hidden">
    <div style={css("padding:1rem 1.1rem;border-bottom:1px solid var(--border-soft)") }>
      <h2 style={css("margin:0;font-size:var(--text-xl);font-weight:500")}>Channels & cadence</h2>
      <p style={css("margin:.2rem 0 0;font-size:var(--text-xs);color:var(--fg-muted)")}>Where we publish, how often, and for how long.</p>
    </div>
    <div style={css("padding:1.05rem 1.1rem 1.1rem") }>
      <span style={css("display:block;font-size:var(--text-label);font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--fg-faint)")}>Channels</span>
      <div style={css("display:flex;align-items:center;gap:.48rem;flex-wrap:wrap;margin-top:.62rem") }>
        {CHANNELS.map(item => {
          const selected = project.channels.includes(item.id);
          return <button key={item.id} type="button" aria-pressed={selected} onClick={() => patch({ channels: selected ? project.channels.filter(id => id !== item.id) : [...project.channels, item.id] })} style={css("display:inline-flex;align-items:center;gap:var(--space-2);min-height:2.6rem;padding:0 .72rem;border:1px solid " + (selected ? "var(--accent)" : "var(--border)") + ";border-radius:999px;background:" + (selected ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (selected ? "var(--fg)" : "var(--fg-muted)") + ";cursor:pointer") }>
            <ChannelMark id={item.id}/>
            <span style={css("font-size:var(--text-2xs);font-weight:500")}>{item.label}</span>
            {selected && <Icon name="checkmark" size={12}/>} 
          </button>;
        })}
      </div>

      <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "minmax(0,1fr) minmax(16rem,.9fr)") + ";gap:var(--space-4);margin-top:1.15rem;align-items:stretch") }>
        <div>
          <span style={css("display:block;font-size:var(--text-label);font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--fg-faint)")}>Duration</span>
          <div style={css("display:grid;grid-template-columns:repeat(3,1fr);max-width:26rem;margin-top:.55rem;border:1px solid var(--border);border-radius:999px;overflow:hidden;background:var(--surface)") }>
            {durations.map(item => <button key={item.weeks} type="button" aria-pressed={project.weeks === item.weeks} onClick={() => patch({ weeks: item.weeks })} style={css("min-height:2.35rem;border:none;border-right:" + (item.weeks !== 4 ? "1px solid var(--border-soft)" : "none") + ";background:" + (project.weeks === item.weeks ? "var(--accent)" : "transparent") + ";color:" + (project.weeks === item.weeks ? "#fff" : "var(--fg-muted)") + ";font-size:var(--text-2xs);font-weight:500;cursor:pointer")}>{item.label}</button>)}
          </div>

          <span style={css("display:block;margin-top:1rem;font-size:var(--text-label);font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--fg-faint)")}>Posts per week</span>
          <div style={css("display:flex;flex-direction:column;gap:.42rem;margin-top:.5rem") }>
            {project.channels.length ? project.channels.map(id => { const item = channel(id); return <div key={id} style={css("display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.7rem;align-items:center;min-height:2.3rem") }><div style={css("display:flex;align-items:center;gap:var(--space-2)") }><ChannelMark id={id}/><span style={css("font-size:var(--text-2xs);font-weight:500")}>{item.label}</span></div><div style={css("display:flex;align-items:center;gap:var(--space-2)") }><button type="button" aria-label={`Reduce ${item.label} cadence`} onClick={() => patch({ cadence: { ...project.cadence, [id]: Math.max(1, project.cadence[id] - 1) } })} style={css("width:1.8rem;height:1.8rem;border:1px solid var(--border);border-radius:.55rem;background:var(--surface);display:grid;place-items:center;cursor:pointer;color:var(--fg-muted)")}><Icon name="minus" size={11}/></button><strong style={css("min-width:1rem;text-align:center;font-size:var(--text-sm);font-weight:500")}>{project.cadence[id]}</strong><button type="button" aria-label={`Increase ${item.label} cadence`} onClick={() => patch({ cadence: { ...project.cadence, [id]: Math.min(7, project.cadence[id] + 1) } })} style={css("width:1.8rem;height:1.8rem;border:1px solid var(--border);border-radius:.55rem;background:var(--surface);display:grid;place-items:center;cursor:pointer;color:var(--accent)")}><Icon name="plus" size={11}/></button></div></div>; }) : <p style={css("margin:.4rem 0 0;font-size:var(--text-2xs);color:var(--fg-faint)")}>Choose at least one channel to set the rhythm.</p>}
          </div>
        </div>

        <div style={css("display:flex;flex-direction:column;min-height:13rem;padding:1.1rem;border:1px solid var(--border-soft);border-radius:.95rem;background:var(--surface-alt)") }>
          <span style={css("font-size:var(--text-label);font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:var(--fg-faint)")}>This plan</span>
          <div style={css("display:flex;align-items:baseline;gap:.45rem;margin-top:.45rem") }><strong style={css("font-size:var(--text-4xl);line-height:1;font-weight:500")}>{total}</strong><span style={css("font-size:var(--text-sm);color:var(--fg-muted)")}>posts</span></div>
          <p style={css("margin:.4rem 0 0;font-size:var(--text-2xs);color:var(--fg-muted)")}>across {project.channels.length} channel{project.channels.length === 1 ? "" : "s"} · {project.weeks} week{project.weeks === 1 ? "" : "s"}</p>
          <div style={css("display:flex;align-items:center;gap:.48rem;flex-wrap:wrap;margin-top:.72rem")}>{project.channels.map(id => { const item = channel(id); return <span key={id} style={css("display:inline-flex;align-items:center;gap:.34rem;font-size:var(--text-2xs);color:var(--fg-muted)")}><ChannelMark id={id} size={1.2} logoSize={10}/>{item.label}</span>; })}</div>
          <button type="button" disabled={!project.channels.length || busy} onClick={buildPlan} style={css(buttonPrimary + ";width:100%;margin-top:auto;opacity:" + (project.channels.length && !busy ? "1" : ".45"))}><Icon name="sparkle" size={13}/>{busy ? "Building plan…" : "Build my content plan"} {!busy && <Icon name="arrow" size={14}/>}</button>
        </div>
      </div>
    </div>
  </Panel>;
}

function BriefStage({ clientName, project, patch, analyze, buildPlan, mobile, aiBusy, aiTick, aiError }: { clientName: string; project: SocialProject; patch: (next: Partial<SocialProject>) => void; analyze: () => void; buildPlan: () => void; mobile: boolean; aiBusy: "analyze" | "plan" | null; aiTick: number; aiError: string }) {
  if (aiBusy) return <Panel style="padding:2rem 1.25rem"><GuidedLoadingState
    accent="var(--accent)"
    heading={aiBusy === "analyze" ? "Reading the brand context" : "Building the content plan"}
    description={aiBusy === "analyze" ? "Extracting the useful voice, themes, and content pillars." : "Turning the approved cadence into editable, channel-ready posts."}
    steps={aiBusy === "analyze" ? ["Reading the sources", "Mapping the voice", "Finding content pillars", "Preparing the brief"] : ["Balancing the cadence", "Drafting the post mix", "Checking channel fit", "Preparing the calendar"]}
    tick={aiTick}
    finalMessages={aiBusy === "analyze" ? ["Checking the dominant voice", "Removing duplicate themes"] : ["Checking the monthly balance", "Preparing the editable plan"]}
    estimatedDuration="About 30–60 seconds"
  /></Panel>;
  return <div style={css("display:flex;flex-direction:column;gap:.8rem") }>
    <SourceAnalyzer clientName={clientName} project={project} patch={patch} analyze={analyze} mobile={mobile} busy={aiBusy === "analyze"} error={aiError}/>
    {project.analyzed && <ChannelCadence project={project} patch={patch} buildPlan={buildPlan} mobile={mobile} busy={aiBusy === "plan"}/>} 
  </div>;
}

function PlanStage({ project, patch, mobile, rebuild, aiBusy, aiTick }: { project: SocialProject; patch: (next: Partial<SocialProject>) => void; mobile: boolean; rebuild: () => void; aiBusy: "analyze" | "plan" | null; aiTick: number }) {
  if (aiBusy === "plan") return <Panel style="padding:2rem 1.25rem"><GuidedLoadingState
    accent="var(--accent)"
    heading="Re-drafting the content plan"
    description="Rebalancing the month without losing the approved voice and cadence."
    steps={["Reviewing the current mix", "Rebalancing the pillars", "Refreshing the posts", "Preparing the revision"]}
    tick={aiTick}
    finalMessages={["Checking channel fit", "Preparing the revised plan"]}
    estimatedDuration="About 30–60 seconds"
  /></Panel>;
  const palette = ["#8d73c5", "#4d8dc8", "#d86478", "#49a36f", "#c58b47"];
  const pillarCounts = project.pillars.map((pillar, index) => ({ pillar, color: palette[index % palette.length], count: project.posts.filter(post => post.pillar === pillar).length }));
  const channelCounts = project.channels.map(id => ({ item: channel(id), count: project.posts.filter(post => postChannelIds(post).includes(id)).length }));
  const crossPostCount = project.posts.filter(post => postChannelIds(post).length > 1).length;
  const singleChannelCount = project.posts.length - crossPostCount;
  const dominant = [...pillarCounts].sort((a, b) => b.count - a.count)[0]?.pillar || "brand story";
  const themes: Record<string, { title: string; description: string }> = {
    Education: { title: "Teach before you sell", description: "Lead with useful answers, then reinforce them with the product, people, and proof behind the brand." },
    "Behind the scenes": { title: "Inside the work", description: "Bring people closer to the process, the thinking, and the human details behind the finished result." },
    Product: { title: "Make the value tangible", description: "Show how the offer fits into real routines, then build confidence with education and proof." },
    Community: { title: "Invite the conversation", description: "Create a month that listens as much as it speaks, with prompts, shared stories, and useful follow-through." },
    Proof: { title: "Show the shift", description: "Use customer outcomes and practical education to make the value visible without relying on hard-sell copy." },
  };
  const theme = themes[dominant] || themes.Education;
  const toggleCrossPost = (post: SocialPost) => {
    const crossPostTo = (post.crossPostTo || []).length ? [] : project.channels.filter(id => id !== post.channel);
    patch({ posts: project.posts.map(item => item.id === post.id ? { ...item, crossPostTo } : item) });
  };

  return <div style={css("display:flex;flex-direction:column;gap:.8rem") }>
    <Panel style="overflow:hidden">
      <div style={css("padding:1rem 1.05rem") }>
        <div style={css("padding:var(--space-4);border:1px solid color-mix(in srgb,var(--accent) 28%,var(--border) 72%);border-radius:.95rem;background:var(--accent-soft)") }>
          <span style={css("font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--accent)")}>This month’s theme</span>
          <h2 style={css("margin:.35rem 0 0;font-size:var(--text-2xl);font-weight:500;letter-spacing:-.01em")}>{theme.title}</h2>
          <p style={css("margin:.38rem 0 0;max-width:48rem;font-size:var(--text-xs);line-height:1.55;color:var(--fg-muted)")}>{theme.description}</p>
        </div>

        <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(7rem,1fr));gap:.55rem;margin-top:.75rem") }>
          {[{ label: "Posts", value: project.posts.length }, { label: "Cross-posts", value: crossPostCount }, { label: "Single channel", value: singleChannelCount }, { label: "Weeks", value: project.weeks }].map(item => <div key={item.label} style={css("padding:.8rem .9rem;border:1px solid var(--border-soft);border-radius:.85rem;background:var(--surface)")}><strong style={css("display:block;font-size:var(--text-2xl);font-weight:500")}>{item.value}</strong><span style={css("display:block;margin-top:.2rem;font-size:var(--text-label);text-transform:uppercase;color:var(--fg-faint)")}>{item.label}</span></div>)}
        </div>

        <div style={css("margin-top:.9rem") }>
          <span style={css("font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-faint)")}>Pillar mix</span>
          <div style={css("display:flex;flex-direction:column;gap:.58rem;margin-top:.55rem") }>{pillarCounts.map(item => { const percent = Math.round(item.count / Math.max(project.posts.length, 1) * 100); return <div key={item.pillar} style={css("display:grid;grid-template-columns:" + (mobile ? "minmax(7.5rem,.8fr) minmax(0,1fr) 3.4rem" : "minmax(9rem,.7fr) minmax(12rem,1.8fr) 4.2rem") + ";gap:.55rem;align-items:center") }><span style={css("display:flex;align-items:center;gap:.45rem;font-size:var(--text-2xs);font-weight:500") }><i style={css("width:.5rem;height:.5rem;border-radius:50%;background:" + item.color)}/>{item.pillar}</span><span style={css("height:.42rem;border-radius:999px;background:var(--border-soft);overflow:hidden") }><i style={css("display:block;height:100%;width:" + percent + "%;border-radius:999px;background:" + item.color)}/></span><span style={css("font-size:var(--text-2xs);color:var(--fg-muted);text-align:right")}>{item.count} · {percent}%</span></div>; })}</div>
        </div>

        <div style={css("margin-top:.9rem") }>
          <span style={css("font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-faint)")}>Channel split</span>
          <div style={css("display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;margin-top:.55rem") }>{channelCounts.map(({ item, count }) => <span key={item.id} style={css("display:inline-flex;align-items:center;gap:var(--space-2);min-height:2.35rem;padding:0 .75rem;border:1px solid var(--border);border-radius:999px;background:var(--surface);font-size:var(--text-2xs);font-weight:500") }><ChannelMark id={item.id} size={1.55} logoSize={13}/>{item.label}<small style={css("font-size:var(--text-2xs);font-weight:400;color:var(--fg-muted)")}>{count} posts</small></span>)}</div>
        </div>
      </div>
      <div style={css("display:flex;align-items:center;justify-content:flex-end;gap:.45rem;flex-wrap:wrap;padding:.8rem 1.05rem;border-top:1px solid var(--border-soft);background:var(--surface-alt)") }>
        <button type="button" onClick={() => patch({ stage: "brief" })} style={css(buttonSoft)}><Icon name="edit" size={13}/>Edit brief</button>
        <button type="button" onClick={rebuild} style={css(buttonSoft)}><Icon name="replay" size={13}/>Re-draft</button>
        <button type="button" onClick={() => patch({ stage: "calendar", selectedPostId: project.posts[0]?.id || null })} style={css(buttonPrimary)}>Approve plan & map the month <Icon name="arrow" size={14}/></button>
      </div>
    </Panel>

    <Panel style="overflow:hidden">
      <div style={css("padding:.82rem 1rem;border-bottom:1px solid var(--border-soft);display:flex;align-items:center;justify-content:space-between;gap:.6rem") }><div><strong style={css("display:block;font-size:var(--text-sm);font-weight:500")}>Planned content</strong><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>Choose one channel or cross-post an idea before mapping the month.</span></div><span style={css("font-size:var(--text-2xs);color:var(--accent)")}>{crossPostCount} cross-post{crossPostCount === 1 ? "" : "s"}</span></div>
      <div style={css("display:grid;grid-template-columns:repeat(auto-fill,minmax(13.5rem,1fr));gap:.55rem;padding:.7rem;max-height:23rem;overflow-y:auto")}>{project.posts.map(post => {
        const crossPosted = postChannelIds(post).length > 1;
        return <article key={post.id} style={css("padding:.7rem;border:1px solid " + (crossPosted ? "color-mix(in srgb,var(--accent) 32%,var(--border-soft) 68%)" : "var(--border-soft)") + ";border-radius:.8rem;background:var(--surface-alt)")}>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:var(--space-2)") }><span style={css("display:inline-flex;align-items:center;gap:.38rem;font-size:var(--text-2xs);color:var(--fg-muted)")}><PostChannelMarks post={post}/>{postDestinationLabel(post)}</span><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>Day {post.day}</span></div>
          <strong style={css("display:block;margin-top:.4rem;font-size:var(--text-2xs);font-weight:500")}>{post.title}</strong>
          <p style={css("margin:.28rem 0 0;font-size:var(--text-2xs);line-height:1.42;color:var(--fg-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden")}>{post.caption}</p>
          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.4rem;margin-top:.48rem") }><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{post.pillar} · {post.format}</span><button type="button" disabled={project.channels.length < 2} onClick={() => toggleCrossPost(post)} style={css("min-height:1.7rem;padding:0 .48rem;border:1px solid " + (crossPosted ? "var(--accent)" : "var(--border)") + ";border-radius:999px;background:" + (crossPosted ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (crossPosted ? "var(--accent)" : "var(--fg-muted)") + ";font-size:var(--text-2xs);cursor:" + (project.channels.length > 1 ? "pointer" : "default") + ";opacity:" + (project.channels.length > 1 ? "1" : ".45"))}>{crossPosted ? "Use one channel" : "+ Cross-post"}</button></div>
        </article>;
      })}</div>
    </Panel>
  </div>;
}

function CalendarStage({ monthKey, project, patch, selectedPost, updatePost, mobile, actions }: { monthKey: string; project: SocialProject; patch: (next: Partial<SocialProject>) => void; selectedPost: SocialPost | null; updatePost: (id: string, next: Partial<SocialPost>) => void; mobile: boolean; actions: PortalActions }) {
  const [year, monthNumber] = monthKey.split("-").map(Number);
  const month = formatMonthKey(monthKey);
  const startOffset = new Date(year, monthNumber - 1, 1).getDay();
  const totalDays = new Date(year, monthNumber, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => index - startOffset + 1);
  const approveAll = () => { patch({ posts: project.posts.map(post => ({ ...post, status: "approved" as const })) }); actions.showToast("All calendar posts approved"); };
  const selectedIndex = selectedPost ? project.posts.findIndex(post => post.id === selectedPost.id) : -1;
  const selectRelativePost = (direction: -1 | 1) => {
    if (!project.posts.length) return;
    const nextIndex = (Math.max(selectedIndex, 0) + direction + project.posts.length) % project.posts.length;
    patch({ selectedPostId: project.posts[nextIndex].id });
  };
  const hashtags = selectedPost?.hashtags.split(/\s+/).filter(Boolean) || [];
  const shuffleHashtags = () => {
    if (!selectedPost || hashtags.length < 2) return;
    updatePost(selectedPost.id, { hashtags: [...hashtags.slice(1), hashtags[0]].join(" ") });
  };
  return <div style={css("display:flex;flex-direction:column;gap:.8rem") }>
    <Panel style="overflow:hidden">
      <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.7rem;flex-wrap:wrap;padding:.85rem 1rem;border-bottom:1px solid var(--border-soft)")}>
        <div><span style={css("font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--accent)")}>Content calendar</span><h2 style={css("margin:.2rem 0 0;font-size:var(--text-lg);font-weight:500")}>{month}</h2></div>
        <div style={css("display:flex;gap:.4rem;align-items:center") }><span style={css("font-size:var(--text-2xs);color:var(--fg-muted)")}>{project.posts.filter(post => post.status === "approved").length}/{project.posts.length} approved</span><button type="button" onClick={approveAll} style={css(buttonSoft)}><Icon name="checkmark" size={13}/>Approve all</button></div>
      </div>
      <div data-social-calendar-viewport style={css("overflow-x:" + (mobile ? "auto" : "hidden") + ";padding:.6rem;box-sizing:border-box") }>
        <div data-social-calendar-grid style={css("width:100%;min-width:" + (mobile ? "39rem" : "0") + ";box-sizing:border-box") }>
          <div style={css("display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.2rem;margin-bottom:.25rem")}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day} style={css("font-size:var(--text-label);text-align:center;text-transform:uppercase;color:var(--fg-faint)")}>{day}</span>)}</div>
          <div style={css("display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.2rem")}>{cells.map((day, index) => {
            const posts = project.posts.filter(post => post.day === day);
            return <div key={index} style={css("min-width:0;min-height:5.1rem;padding:.28rem;border:1px solid var(--border-soft);border-radius:.5rem;background:" + (day > 0 && day <= totalDays ? "var(--surface-alt)" : "color-mix(in srgb,var(--surface-alt) 42%,transparent 58%)"))}>
              {day > 0 && day <= totalDays && <span style={css("display:block;font-size:var(--text-2xs);color:var(--fg-faint);margin-bottom:.18rem")}>{day}</span>}
              {posts.slice(0, 2).map(post => <button key={post.id} type="button" aria-label={`${postDestinationLabel(post)}: ${post.title}`} onClick={() => patch({ selectedPostId: post.id })} style={css("display:block;width:100%;margin-top:.16rem;padding:.2rem .22rem;border:1px solid " + (project.selectedPostId === post.id ? channel(post.channel).color : "transparent") + ";border-radius:.32rem;background:color-mix(in srgb," + channel(post.channel).color + " 12%,var(--surface) 88%);color:var(--fg);text-align:left;cursor:pointer;overflow:hidden") }><span style={css("display:flex;align-items:center;gap:.18rem;color:" + channel(post.channel).color)}><PostChannelMarks post={post} size={.86} logoSize={7} max={2}/><span style={css("min-width:0;font-size:var(--text-2xs);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{postChannelIds(post).length > 1 ? "Cross-post" : channel(post.channel).label}</span></span><span style={css("display:block;margin-top:.1rem;font-size:var(--text-2xs);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{post.title}</span></button>)}
              {posts.length > 2 && <span style={css("display:block;margin-top:.18rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>+{posts.length - 2} more</span>}
            </div>;
          })}</div>
        </div>
      </div>
    </Panel>
    {selectedPost && <Panel style="overflow:hidden;border-color:color-mix(in srgb,var(--accent) 34%,var(--border) 66%)">
      <div style={css("display:flex;align-items:center;gap:.7rem;flex-wrap:wrap;padding:.8rem 1rem;border-bottom:1px solid var(--border-soft)") }>
        <PostChannelMarks post={selectedPost} size={2} logoSize={17}/>
        <div><strong style={css("display:block;font-size:var(--text-base);font-weight:500")}>{postDestinationLabel(selectedPost)}</strong><span style={css("display:block;margin-top:.08rem;font-size:var(--text-2xs);color:var(--fg-muted)")}>{postChannelIds(selectedPost).map(id => channel(id).label).join(" + ")} · {month.split(" ")[0]} {selectedPost.day} · {selectedPost.time}</span></div>
        <span style={css("padding:.2rem .55rem;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:var(--text-2xs)")}>{selectedPost.format}</span>
        <div style={css("display:flex;align-items:center;gap:.38rem;margin-left:auto") }><span style={css("font-size:var(--text-2xs);color:var(--fg-faint);margin-right:.1rem")}>{selectedIndex + 1} / {project.posts.length}</span><button type="button" aria-label="Previous post" onClick={() => selectRelativePost(-1)} style={css("width:2rem;height:2rem;border:1px solid var(--border);border-radius:50%;background:var(--surface);color:var(--fg-muted);cursor:pointer")}>‹</button><button type="button" aria-label="Next post" onClick={() => selectRelativePost(1)} style={css("width:2rem;height:2rem;border:1px solid var(--border);border-radius:50%;background:var(--surface);color:var(--fg-muted);cursor:pointer")}>›</button></div>
      </div>

      <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "minmax(12rem,.72fr) minmax(0,2.15fr)") + ";gap:var(--space-4);padding:var(--space-4)") }>
        <div>
          <label style={css("display:grid;place-items:center;min-height:12rem;padding:var(--space-4);border:1.5px dashed var(--border);border-radius:.9rem;background:var(--surface-alt);text-align:center;cursor:pointer") }>
            <input type="file" accept="image/*,video/*" onChange={event => { const file = event.target.files?.[0]; if (file) updatePost(selectedPost.id, { assetName: file.name }); }} style={{ display: "none" }}/>
            <span><Icon name="file" size={24}/><strong style={css("display:block;margin-top:.55rem;font-size:var(--text-xs);font-weight:500")}>{selectedPost.assetName || `Drop ${selectedPost.format.toLowerCase()} art`}</strong><span style={css("display:block;margin-top:.25rem;font-size:var(--text-2xs);color:var(--fg-muted)")}>{selectedPost.assetName ? "Click to replace" : "or browse files"}</span><span style={css("display:block;margin-top:.65rem;font-size:var(--text-2xs);font-weight:500;color:var(--accent)")}>{selectedPost.graphicCopy || selectedPost.title}</span></span>
          </label>
          <div style={css("display:flex;align-items:center;justify-content:space-between;margin-top:.72rem") }><span style={css("font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-faint)")}>Art format</span><span style={css("font-size:var(--text-2xs);color:var(--fg-faint)")}>{selectedPost.format === "Vertical video" || selectedPost.format === "Story" ? "1080 × 1920" : selectedPost.format === "Landscape image" ? "1920 × 1080" : "1080 × 1080"}</span></div>
          <div style={css("display:flex;flex-direction:column;gap:.38rem;margin-top:.48rem") }>{ART_FORMATS.map(format => { const active = selectedPost.format === format.value; return <button key={format.value} type="button" aria-pressed={active} onClick={() => updatePost(selectedPost.id, { format: format.value })} style={css("display:flex;align-items:center;gap:.55rem;min-height:2.35rem;padding:0 .68rem;border:1px solid " + (active ? "var(--accent)" : "var(--border-soft)") + ";border-radius:.7rem;background:" + (active ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (active ? "var(--accent)" : "var(--fg-muted)") + ";font-size:var(--text-2xs);font-weight:500;cursor:pointer;text-align:left") }><span style={css("width:.85rem;height:" + (format.ratio === "9:16" ? "1.15rem" : format.ratio === "16:9" ? ".62rem" : ".85rem") + ";border:1.5px solid currentColor;border-radius:.12rem")}/>{format.label}<span style={css("margin-left:auto;font-size:var(--text-2xs);color:var(--fg-faint)")}>{format.ratio}</span></button>; })}</div>
        </div>

        <div>
          <div style={css("padding:.72rem .75rem;border:1px solid var(--border-soft);border-radius:.8rem;background:var(--surface-alt);margin-bottom:.8rem") }>
            <div style={css("display:flex;align-items:flex-start;justify-content:space-between;gap:.7rem;flex-wrap:wrap") }><div><span style={css("display:block;font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-faint)")}>Publishing channels</span><span style={css("display:block;margin-top:.18rem;font-size:var(--text-2xs);color:var(--fg-muted)")}>Keep the primary channel selected, then add or remove cross-post destinations.</span></div><span style={css("padding:.2rem .5rem;border-radius:999px;background:" + (postChannelIds(selectedPost).length > 1 ? "var(--accent-soft)" : "var(--surface)") + ";border:1px solid " + (postChannelIds(selectedPost).length > 1 ? "color-mix(in srgb,var(--accent) 28%,var(--border) 72%)" : "var(--border)") + ";font-size:var(--text-2xs);color:" + (postChannelIds(selectedPost).length > 1 ? "var(--accent)" : "var(--fg-muted)"))}>{postDestinationLabel(selectedPost)}</span></div>
            <div style={css("display:flex;align-items:center;gap:.38rem;flex-wrap:wrap;margin-top:.58rem") }>{project.channels.map(id => {
              const primary = id === selectedPost.channel;
              const active = primary || (selectedPost.crossPostTo || []).includes(id);
              return <button key={id} type="button" aria-pressed={active} onClick={() => { if (primary) return; const current = selectedPost.crossPostTo || []; updatePost(selectedPost.id, { crossPostTo: current.includes(id) ? current.filter(item => item !== id) : [...current, id] }); }} style={css("display:inline-flex;align-items:center;gap:.36rem;min-height:2rem;padding:0 .58rem;border:1px solid " + (active ? "var(--accent)" : "var(--border)") + ";border-radius:999px;background:" + (active ? "var(--accent-soft)" : "var(--surface)") + ";color:" + (active ? "var(--fg)" : "var(--fg-muted)") + ";font-size:var(--text-2xs);cursor:" + (primary ? "default" : "pointer"))}><ChannelMark id={id} size={1.15} logoSize={9}/>{channel(id).label}{primary ? <small style={css("font-size:var(--text-2xs);color:var(--accent)")}>Primary</small> : active ? <Icon name="checkmark" size={10}/> : null}</button>;
            })}</div>
          </div>
          <input aria-label="Post title" value={selectedPost.title} onChange={event => updatePost(selectedPost.id, { title: event.target.value })} style={css("width:100%;box-sizing:border-box;border:none;background:transparent;color:var(--fg);padding:.05rem 0 .5rem;font:inherit;font-size:var(--text-xl);font-weight:500;outline:none")}/>
          <label style={css("display:block;margin-top:.35rem;font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-faint)")}>Caption</label>
          <textarea aria-label="Post caption" value={selectedPost.caption} onChange={event => updatePost(selectedPost.id, { caption: event.target.value })} rows={5} style={css(inputStyle + ";margin-top:.38rem;resize:vertical;line-height:1.55")}/>

          <div style={css("display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.7rem") }><span style={css("font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-faint)")}>Hashtags</span><button type="button" onClick={shuffleHashtags} style={css("border:none;background:none;color:var(--accent);font-size:var(--text-2xs);cursor:pointer")}>Shuffle</button></div>
          <div style={css("display:flex;align-items:center;gap:.35rem;flex-wrap:wrap;margin-top:.4rem")}>{hashtags.map(tag => <button key={tag} type="button" title="Remove hashtag" onClick={() => updatePost(selectedPost.id, { hashtags: hashtags.filter(item => item !== tag).join(" ") })} style={css("padding:.28rem .55rem;border:none;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:var(--text-2xs);cursor:pointer")}>{tag}</button>)}</div>

          <div style={css("display:grid;grid-template-columns:" + (mobile ? "1fr" : "1fr 1fr") + ";gap:.65rem;margin-top:.8rem") }>
            <label><span style={css("display:block;font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-faint)")}>Graphic copy · On-image text</span><input value={selectedPost.graphicCopy || selectedPost.title} onChange={event => updatePost(selectedPost.id, { graphicCopy: event.target.value })} style={css(inputStyle + ";margin-top:.35rem;font-weight:500")}/></label>
            <label><span style={css("display:block;font-size:var(--text-label);font-weight:500;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-faint)")}>Link in bio</span><input value={selectedPost.link || "yourbrand.com"} onChange={event => updatePost(selectedPost.id, { link: event.target.value })} style={css(inputStyle + ";margin-top:.35rem;color:var(--accent)")}/></label>
          </div>
          <label style={css("display:block;margin-top:.7rem;padding:.65rem .72rem;border-radius:.75rem;background:var(--surface-alt)") }><span style={css("font-size:var(--text-2xs);font-weight:500;color:var(--accent)")}>Art direction</span><textarea value={selectedPost.artDirection || `${selectedPost.format} with natural light and clear on-image copy.`} onChange={event => updatePost(selectedPost.id, { artDirection: event.target.value })} rows={2} style={css("width:100%;box-sizing:border-box;border:none;background:transparent;color:var(--fg-muted);padding:.25rem 0 0;font:inherit;font-size:var(--text-2xs);line-height:1.45;outline:none;resize:vertical")}/></label>
        </div>
      </div>

      <div style={css("display:flex;align-items:center;gap:.45rem;flex-wrap:wrap;padding:.8rem 1rem;border-top:1px solid var(--border-soft);background:var(--surface-alt)") }>
        <button type="button" onClick={() => selectRelativePost(1)} style={css("border:none;background:none;color:var(--fg-faint);font-size:var(--text-2xs);cursor:pointer")}>Skip for now</button>
        <button type="button" onClick={() => { updatePost(selectedPost.id, { status: selectedPost.status === "approved" ? "draft" : "approved" }); if (selectedPost.status !== "approved") selectRelativePost(1); }} style={css(buttonPrimary + ";margin-left:auto;background:" + (selectedPost.status === "approved" ? "var(--success)" : "var(--accent)"))}><Icon name="checkmark" size={13}/>{selectedPost.status === "approved" ? "Approved · return to draft" : "Approve post"} <Icon name="arrow" size={13}/></button>
      </div>
    </Panel>}
    <div style={css("display:flex;justify-content:flex-end") }><button type="button" onClick={() => patch({ stage: "schedule" })} style={css(buttonPrimary)}>Confirm calendar <Icon name="arrow" size={14}/></button></div>
  </div>;
}

function ScheduleStage({ project, approved, exportCsv, actions, patch }: { project: SocialProject; approved: number; exportCsv: () => void; actions: PortalActions; patch: (next: Partial<SocialProject>) => void }) {
  const crossPostCount = project.posts.filter(post => postChannelIds(post).length > 1).length;
  return <div style={css("display:flex;flex-direction:column;gap:.8rem") }>
    <Panel style="padding:1.2rem">
      <div style={css("width:2.6rem;height:2.6rem;border-radius:.8rem;background:var(--success-soft);color:var(--success);display:grid;place-items:center") }><Icon name="checkmark" size={18}/></div>
      <span style={css("display:block;margin-top:.75rem;font-size:var(--text-label);text-transform:uppercase;letter-spacing:.04em;color:var(--success)")}>{project.sent ? "Scheduled" : "Calendar approved"}</span>
      <h2 style={css("margin:.28rem 0 0;font-size:var(--text-xl);font-weight:500")}>{project.sent ? "The month is queued and ready." : "The social plan is ready to schedule."}</h2>
      <p style={css("margin:.42rem 0 0;max-width:40rem;font-size:var(--text-2xs);line-height:1.55;color:var(--fg-muted)")}>Export the complete calendar for your scheduling tool or share this dashboard view for client review. Every caption, hashtag, date, and art format stays attached to its post.</p>
      <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(7rem,1fr));gap:var(--space-2);margin-top:.9rem")}>{[{ label: "Total posts", value: project.posts.length }, { label: "Approved", value: approved }, { label: "Cross-posts", value: crossPostCount }, { label: "Single channel", value: project.posts.length - crossPostCount }, { label: "Weeks", value: project.weeks }].map(item => <div key={item.label} style={css("padding:.72rem;border:1px solid var(--border-soft);border-radius:.75rem;background:var(--surface-alt)")}><strong style={css("display:block;font-size:var(--text-xl);font-weight:500;color:var(--accent)")}>{item.value}</strong><span style={css("display:block;margin-top:.18rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{item.label}</span></div>)}</div>
      <div style={css("display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.9rem") }>{!project.sent && <button type="button" onClick={() => { patch({ sent: true }); actions.showToast(`${project.posts.length} posts queued for scheduling`); }} style={css(buttonPrimary)}><Icon name="send" size={13}/>Schedule all posts</button>}<button type="button" onClick={exportCsv} style={css(buttonSoft)}><Icon name="file" size={13}/>Export CSV</button><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(window.location.href); actions.showToast("Dashboard link copied"); } catch { actions.showToast("Share link is ready in the address bar"); } }} style={css(buttonSoft)}><Icon name="send" size={13}/>Share client link</button></div>
    </Panel>
    <Panel style="overflow:hidden">
      <div style={css("overflow-x:auto") }>
        <div style={css("display:grid;grid-template-columns:4rem 8rem minmax(10rem,1fr) 7rem 6rem;gap:.6rem;padding:.65rem .8rem;border-bottom:1px solid var(--border-soft);background:var(--surface-alt);font-size:var(--text-label);text-transform:uppercase;color:var(--fg-faint);min-width:43.5rem") }><span>Date</span><span>Destinations</span><span>Content</span><span>Format</span><span>Status</span></div>
        <div style={css("max-height:26rem;overflow-y:auto;min-width:43.5rem")}>{project.posts.map(post => <div key={post.id} style={css("display:grid;grid-template-columns:4rem 8rem minmax(10rem,1fr) 7rem 6rem;gap:.6rem;align-items:center;padding:.65rem .8rem;border-bottom:1px solid var(--border-soft);font-size:var(--text-2xs)") }><span style={css("color:var(--fg-faint)")}>Day {post.day}</span><span style={css("display:flex;align-items:center;gap:.38rem;color:" + (postChannelIds(post).length > 1 ? "var(--accent)" : "var(--fg-muted)"))}><PostChannelMarks post={post} size={1.25} logoSize={10}/><span>{postChannelIds(post).length > 1 ? "Cross-post" : "Single"}</span></span><span><strong style={css("display:block;font-size:var(--text-2xs);font-weight:500")}>{post.title}</strong><small style={css("display:block;margin-top:.12rem;font-size:var(--text-2xs);color:var(--fg-faint)")}>{post.time}</small></span><span style={css("color:var(--fg-muted)")}>{post.format}</span><span style={css("color:" + (post.status === "approved" ? "var(--success)" : "var(--fg-faint)"))}>{post.status}</span></div>)}</div>
      </div>
    </Panel>
  </div>;
}
