"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginPage } from "@/components/LoginPage";
import { PagePreloader } from "@/components/PagePreloader";
import type { DashboardUserRole } from "@/types";

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

  useEffect(() => {
    const saved = sessionStorage.getItem("bs-user");
    if (saved) router.replace(nextPath);
  }, [nextPath, router]);

  function handleLogin(user: { email: string; role: DashboardUserRole; name: string }) {
    sessionStorage.setItem("bs-user", JSON.stringify(user));
    router.push(nextPath);
  }

  return <LoginPage onLogin={handleLogin} />;
}

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}
