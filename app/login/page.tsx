"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginPage } from "@/components/LoginPage";
import { PagePreloader } from "@/components/PagePreloader";
import { fetchAuthenticatedDashboardUser, safeNextPath } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  REMEMBERED_LOGIN_STORAGE_KEY,
  REMEMBER_LOGIN_AFTER_OAUTH_STORAGE_KEY,
  type LoginUser,
} from "@/lib/authTypes";

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
  const [rememberedProfile, setRememberedProfile] = useState<LoginUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function syncExistingSession() {
      try {
        setRememberedProfile(readRememberedProfile());

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

        const user = data.session
          ? await fetchAuthenticatedDashboardUser()
          : null;

        if (user) {
          sessionStorage.setItem("bs-user", JSON.stringify(user));
          if (sessionStorage.getItem(REMEMBER_LOGIN_AFTER_OAUTH_STORAGE_KEY) === "true") {
            saveRememberedProfile(user);
          }
          sessionStorage.removeItem(REMEMBER_LOGIN_AFTER_OAUTH_STORAGE_KEY);
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

  function handleLogin(user: LoginUser, rememberProfile: boolean) {
    sessionStorage.setItem("bs-user", JSON.stringify(user));
    sessionStorage.removeItem(REMEMBER_LOGIN_AFTER_OAUTH_STORAGE_KEY);
    if (rememberProfile) {
      saveRememberedProfile(user);
    } else {
      clearRememberedProfile();
    }
    router.push(nextPath);
  }

  function handleForgetProfile() {
    clearRememberedProfile();
    setRememberedProfile(null);
  }

  if (!sessionChecked) {
    return <PagePreloader />;
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      rememberedProfile={rememberedProfile}
      onForgetProfile={handleForgetProfile}
      nextPath={nextPath}
      initialMessage={messageFromSearchParam(authError)}
    />
  );
}

function readRememberedProfile(): LoginUser | null {
  try {
    const stored = localStorage.getItem(REMEMBERED_LOGIN_STORAGE_KEY);
    if (!stored) return null;

    const value = JSON.parse(stored) as Partial<LoginUser> | null;
    if (
      !value
      || typeof value.email !== "string"
      || typeof value.name !== "string"
      || !isDashboardRole(value.role)
    ) {
      clearRememberedProfile();
      return null;
    }

    return {
      email: value.email,
      name: value.name,
      role: value.role,
      ...(typeof value.clientName === "string" ? { clientName: value.clientName } : {}),
    };
  } catch {
    clearRememberedProfile();
    return null;
  }
}

function saveRememberedProfile(user: LoginUser) {
  try {
    localStorage.setItem(REMEMBERED_LOGIN_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Authentication should still succeed when browser storage is unavailable.
  }
}

function clearRememberedProfile() {
  try {
    localStorage.removeItem(REMEMBERED_LOGIN_STORAGE_KEY);
  } catch {
    // The account switch still updates in-memory state when storage is unavailable.
  }
}

function isDashboardRole(role: unknown): role is LoginUser["role"] {
  return role === "admin" || role === "manager" || role === "client";
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
