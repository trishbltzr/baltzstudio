"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardUserRole } from "@/types";
import { Portal } from "@/portal/Portal";
import type { Role as PortalRole } from "@/portal/types";
import type { LoginUser } from "@/lib/authTypes";
import { fetchAuthenticatedDashboardUser } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Map the login role onto the redesigned portal's role model (manager → dev).
function mapPortalRole(role: DashboardUserRole): PortalRole {
  if (role === "client") return "client";
  if (role === "manager") return "dev";
  return "admin";
}

export default function Dashboard() {
  const router = useRouter();
  const [userLoaded, setUserLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<LoginUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Read the cached session so returning users can render immediately.
    let savedUser: LoginUser | null = null;
    const saved = sessionStorage.getItem("bs-user");
    if (saved) {
      try {
        savedUser = JSON.parse(saved) as LoginUser;
      } catch {
        sessionStorage.removeItem("bs-user");
      }
    }

    // Optimistic paint: show the portal from the cached user right away instead
    // of blocking first paint on the /api/auth/me round-trip. All protected data
    // is still fetched from auth-enforcing APIs, and the background revalidation
    // below redirects to /login if the session is actually stale.
    if (savedUser) {
      setCurrentUser(savedUser);
      setUserLoaded(true);
    }

    async function revalidateCurrentUser() {
      const sessionUser = await fetchAuthenticatedDashboardUser();
      if (cancelled) return;
      const verifiedUser = sessionUser
        ? {
          ...sessionUser,
          ...(savedUser?.email.toLowerCase() === sessionUser.email.toLowerCase() && savedUser.clientName
            ? { clientName: savedUser.clientName }
            : {}),
        }
        : null;
      if (verifiedUser) {
        sessionStorage.setItem("bs-user", JSON.stringify(verifiedUser));
        setCurrentUser(verifiedUser);
      } else {
        sessionStorage.removeItem("bs-user");
        setCurrentUser(null);
      }
      setUserLoaded(true);
    }

    void revalidateCurrentUser();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (userLoaded && !currentUser) {
      router.replace("/login");
    }
  }, [userLoaded, currentUser, router]);

  function handleLogout() {
    sessionStorage.removeItem("bs-user");
    void createSupabaseBrowserClient().auth.signOut();
    if (process.env.NODE_ENV !== "production") {
      void fetch("/api/dev-login", { method: "DELETE" });
    }
    setCurrentUser(null);
    router.push("/login");
  }

  if (!userLoaded || !currentUser) return null;

  // Redesigned unified portal (replaces the old AdminView/ClientView shells).
  return (
    <div className="bs-app">
      <Portal
        seedRole={mapPortalRole(currentUser.role)}
        clientName={currentUser.clientName}
        userEmail={currentUser.email}
        canSwitchRoles={currentUser.role === "admin"}
        onLogout={handleLogout}
      />
    </div>
  );
}
