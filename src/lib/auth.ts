import type { DashboardUserRole } from "@/types";
import type { LoginUser } from "@/lib/authTypes";

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

  return {
    email: normalizedEmail,
    role: inferRole(normalizedEmail),
    name: normalizeName(fallbackName) || humanizeEmail(normalizedEmail),
  };
}

export async function fetchAuthenticatedDashboardUser(): Promise<LoginUser | null> {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;

  const payload = await response.json().catch(() => null) as { user?: Partial<LoginUser> } | null;
  const user = payload?.user;
  if (
    !user
    || typeof user.email !== "string"
    || typeof user.name !== "string"
    || !isDashboardRole(user.role)
  ) {
    return null;
  }

  return {
    email: user.email,
    name: user.name,
    role: user.role,
    ...(typeof user.clientName === "string" ? { clientName: user.clientName } : {}),
  };
}

function inferRole(email: string): DashboardUserRole {
  if (email === "manager@baltazarstudio.co") return "manager";
  if (email.endsWith("@baltazarstudio.co")) return "admin";
  return "client";
}

function isDashboardRole(role: unknown): role is DashboardUserRole {
  return role === "admin" || role === "manager" || role === "client";
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
