import type { DashboardUserRole } from "@/types";

export type LoginUser = {
  email: string;
  role: DashboardUserRole;
  name: string;
};

export type DemoUser = LoginUser & {
  password: string;
};

export const DEMO_USERS: DemoUser[] = [
  { email: "trisha@baltazarstudio.co", password: "studio123", role: "admin", name: "Trisha Baltazar" },
  { email: "kier@baltazarstudio.co", password: "member123", role: "manager", name: "Kier Mangibin" },
  { email: "client@baltazarstudio.co", password: "client123", role: "client", name: "Blue Ribbon" },
];

export function findDemoUserByRole(role: string | null) {
  return role ? DEMO_USERS.find(user => user.role === role) : undefined;
}

export function findDemoUserByEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail ? DEMO_USERS.find(user => user.email === normalizedEmail) : undefined;
}

function normalizeEmail(email: string | null | undefined) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}
