import type { DashboardUserRole } from "@/types";
import { STUDIO_CLIENTS } from "@/portal/clients";

export type LoginUser = {
  email: string;
  role: DashboardUserRole;
  name: string;
  clientName?: string;
};

export type DemoUser = LoginUser & {
  password: string;
};

const CLIENT_DEMO_USERS: DemoUser[] = STUDIO_CLIENTS.map(client => ({
  email: `${client.id}@client.baltazarstudio.co`,
  password: "client123",
  role: "client",
  name: client.name,
  clientName: client.name,
}));

export const DEMO_USERS: DemoUser[] = [
  { email: "trisha@baltazarstudio.co", password: "studio123", role: "admin", name: "Trisha Baltazar" },
  { email: "kier@baltazarstudio.co", password: "member123", role: "manager", name: "Kier Mangibin" },
  ...CLIENT_DEMO_USERS,
];

export function findDemoUserByEmail(email: string | null | undefined) {
  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail ? DEMO_USERS.find(user => user.email === normalizedEmail) : undefined;
}

function normalizeEmail(email: string | null | undefined) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}
