"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginPage } from "@/components/LoginPage";
import { PagePreloader } from "@/components/PagePreloader";
import { resolveDashboardUser, safeNextPath } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { LoginUser } from "@/lib/demoUsers";

export default function Page() {
  return (
    <Suspense fallback={<PagePreloader />}>
      <LoginRoute />
    </Suspense>
  );
}

function LoginRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const authError = searchParams.get("authError");
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncExistingSession() {
      try {
        const saved = sessionStorage.getItem("bs-user");
        if (saved) {
          router.replace(nextPath);
          return;
        }

        const supabase = createSupabaseBrowserClient();
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<"timeout">(resolve => {
            setTimeout(() => resolve("timeout"), 1800);
          }),
        ]);
        if (cancelled) return;

        if (sessionResult === "timeout") {
          setSessionChecked(true);
          return;
        }

        const { data, error } = sessionResult;
        if (error) {
          console.error("Unable to inspect Supabase session on login.", error);
          setSessionChecked(true);
          return;
        }

        const user = resolveDashboardUser(
          data.session?.user.email,
          pickSupabaseName(data.session?.user.user_metadata),
        );

        if (user) {
          sessionStorage.setItem("bs-user", JSON.stringify(user));
          router.replace(nextPath);
          return;
        }

        setSessionChecked(true);
      } catch (error) {
        console.error("Unexpected login session bootstrap error.", error);
        if (!cancelled) setSessionChecked(true);
      }
    }

    void syncExistingSession();

    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  function handleLogin(user: LoginUser) {
    sessionStorage.setItem("bs-user", JSON.stringify(user));
    router.push(nextPath);
  }

  if (!sessionChecked) {
    return <PagePreloader />;
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      nextPath={nextPath}
      initialMessage={messageFromSearchParam(authError)}
    />
  );
}

function messageFromSearchParam(authError: string | null) {
  if (authError === "callback") {
    return {
      tone: "error" as const,
      text: "We couldn't complete that sign-in link. Please try again from the login page.",
    };
  }

  return null;
}

function pickSupabaseName(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  return typeof record.full_name === "string"
    ? record.full_name
    : typeof record.name === "string"
      ? record.name
      : null;
}
