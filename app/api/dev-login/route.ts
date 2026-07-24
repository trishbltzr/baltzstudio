import { NextResponse } from "next/server";
import type { LoginUser } from "@/lib/authTypes";
import { STUDIO_CLIENTS } from "@/portal/clients";
import {
  DEVELOPMENT_LOGIN_COOKIE,
  createDevelopmentLoginToken,
  developmentLoginCookieOptions,
} from "@/lib/developmentLoginSession";
import { createSupabasePrivilegedServerClient } from "@/lib/supabase/privileged";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DevelopmentLogin = LoginUser & {
  password: string;
  supabaseEmail?: string;
};

const DEVELOPMENT_LOGINS: DevelopmentLogin[] = [
  {
    email: "trisha@baltazarstudio.co",
    password: "studio123",
    role: "admin",
    name: "Trisha Baltazar",
    supabaseEmail: "baltazartrishajoan@gmail.com",
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

  if (match.supabaseEmail) {
    const privileged = await createSupabasePrivilegedServerClient();
    const { data: link, error: linkError } = await privileged.auth.admin.generateLink({
      type: "magiclink",
      email: match.supabaseEmail,
    });
    const tokenHash = link.properties?.hashed_token;
    if (linkError || !tokenHash) {
      return NextResponse.json({
        error: linkError?.message || "The local Supabase session could not be created.",
      }, { status: 500 });
    }

    const supabase = await createSupabaseServerClient();
    const { error: sessionError } = await supabase.auth.verifyOtp({
      type: "magiclink",
      token_hash: tokenHash,
    });
    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }
  }

  const { password: _password, supabaseEmail: _supabaseEmail, ...user } = match;
  const response = NextResponse.json({ user });
  response.cookies.set(
    DEVELOPMENT_LOGIN_COOKIE,
    createDevelopmentLoginToken(user.email),
    developmentLoginCookieOptions(),
  );
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEVELOPMENT_LOGIN_COOKIE, "", {
    ...developmentLoginCookieOptions(),
    maxAge: 0,
  });
  return response;
}
