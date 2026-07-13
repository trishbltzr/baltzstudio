"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DashboardUserRole } from "@/types";
import { Portal } from "@/portal/Portal";
import type { Role as PortalRole } from "@/portal/types";
import type { LoginUser } from "@/lib/demoUsers";

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
    const saved = sessionStorage.getItem("bs-user");
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved) as LoginUser);
      } catch {
        sessionStorage.removeItem("bs-user");
      }
    }
    setUserLoaded(true);
  }, []);

  useEffect(() => {
    if (userLoaded && !currentUser) {
      router.replace("/login");
    }
  }, [userLoaded, currentUser, router]);

  function handleLogout() {
    sessionStorage.removeItem("bs-user");
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
        canSwitchRoles={currentUser.role === "admin"}
        onLogout={handleLogout}
      />
    </div>
  );
}
