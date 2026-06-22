import { CalendarDays, ClipboardList, Database, Globe, Send, Workflow } from "lucide-react";
import type { Project } from "../types";
import { allGates } from "../lib/projectUtils";
import { Panel } from "./shared";

export function StatGrid({ project, className = "" }: { project: Project; className?: string }) {
  const pendingGates = allGates(project).filter(g => g.gate.status === "sent" || g.gate.status === "ready");
  const daysActive = Math.max(0, Math.floor((Date.now() - new Date(project.startDate).getTime()) / 86400000));
  const activeMilestone = project.milestones.find(milestone => milestone.status === "active");
  const isDevelopmentStage = Boolean(activeMilestone?.clientLabel.toLowerCase().includes("build") && pendingGates.length === 0);

  const stats = isDevelopmentStage
    ? [
        { label: "Platform",    value: project.platform,                                                       icon: Globe },
        { label: "Started",     value: project.startDate,                                                      icon: ClipboardList },
        { label: "Days Active", value: `${daysActive}`,                                                        icon: CalendarDays },
        { label: "Open Gates",  value: pendingGates.length === 0 ? "None Pending" : `${pendingGates.length} Pending`, icon: Send },
      ]
    : [
        { label: "Builder",      value: project.platform,                       icon: Globe },
        { label: "CMS",          value: `${project.platform} CMS`,               icon: Database },
        { label: "Integrations", value: "Forms + Analytics",                    icon: Workflow },
        { label: "Access",       value: pendingGates.length ? "Review Pending" : "Ready For Build", icon: Send },
      ];

  const content = (
    <>
      <div className="stat-grid">
        {stats.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="stat-card">
              <div className="stat-icon"><Icon /></div>
              <div>
                <div className="stat-label">{c.label}</div>
                <div className="stat-value">{c.value}</div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  if (className) {
    return <div className={className}>{content}</div>;
  }

  return <Panel>{content}</Panel>;
}
