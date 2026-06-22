"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginPage } from "@/components/LoginPage";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const saved = sessionStorage.getItem("bs-user");
    if (saved) router.replace("/dashboard");
  }, [router]);

  function handleLogin(user: { email: string; role: "admin" | "client"; name: string }) {
    sessionStorage.setItem("bs-user", JSON.stringify(user));
    router.push("/dashboard");
  }

  return <LoginPage onLogin={handleLogin} />;
}
