import { NextResponse } from "next/server";
import type { LoginUser } from "@/lib/authTypes";
import { STUDIO_CLIENTS } from "@/portal/clients";

type DevelopmentLogin = LoginUser & { password: string };

const DEVELOPMENT_LOGINS: DevelopmentLogin[] = [
  {
    email: "trisha@baltazarstudio.co",
    password: "studio123",
    role: "admin",
    name: "Trisha Baltazar",
  },
  {
    email: "kier@baltazarstudio.co",
    password: "member123",
    role: "manager",
    name: "Kier Mangibin",
  },
  ...STUDIO_CLIENTS.map(client => ({
    email: `${client.id}@client.baltazarstudio.co`,
    password: "client123",
    role: "client" as const,
    name: client.name,
    clientName: client.name,
  })),
];

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const match = DEVELOPMENT_LOGINS.find(user => user.email === email && user.password === password);

  if (!match) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const { password: _password, ...user } = match;
  return NextResponse.json({ user });
}
