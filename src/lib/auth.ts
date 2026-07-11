import type { DashboardUserRole } from "@/types";
import { findDemoUserByEmail, type LoginUser } from "@/lib/demoUsers";

export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export function resolveDashboardUser(
  email: string | null | undefined,
  fallbackName?: string | null,
): LoginUser | null {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const demoUser = findDemoUserByEmail(normalizedEmail);
  if (demoUser) {
    return {
      email: demoUser.email,
      role: demoUser.role,
      name: demoUser.name,
    };
  }

  return {
    email: normalizedEmail,
    role: inferRole(normalizedEmail),
    name: normalizeName(fallbackName) || humanizeEmail(normalizedEmail),
  };
}

function inferRole(email: string): DashboardUserRole {
  if (email === "manager@baltazarstudio.co") return "manager";
  if (email.endsWith("@baltazarstudio.co")) return "admin";
  return "client";
}

function normalizeEmail(email: string | null | undefined) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function normalizeName(name: string | null | undefined) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  return trimmed || "";
}

function humanizeEmail(email: string) {
  const localPart = email.split("@")[0] || "";
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ") || "Portal user";
}
